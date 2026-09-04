/*
 * @Description: 部门服务层（MongoDB/Mongoose 版本）
 * @Author: AI Assistant
 * @Date: 2025-10-24
 */

const Service = require("egg").Service;
const { DataScope } = require("../../decorator/dataScope");

class DeptService extends Service {
  /** 获取模型快捷访问 */
  get model() {
    return this.ctx.model;
  }

  /** 将字符串 ID 转换为 ObjectId */
  _toObjectId(id) {
    if (!id) return id;
    return typeof id === "string"
      ? new this.app.mongoose.Types.ObjectId(id)
      : id;
  }

  /** 将 Mongoose 文档标准化，统一 deptId = _id */
  _normalizeDept(doc) {
    if (!doc) return doc;
    return { ...doc, deptId: doc._id };
  }

  // ==================== 查询条件构建 ====================

  /**
   * 构建部门查询条件
   * 对应原 _buildDeptListSql
   */
  _buildDeptFilter(params) {
    const filter = { delFlag: "0" };

    if (params.deptId != null && params.deptId != 0) {
      filter._id = this._toObjectId(params.deptId);
    }
    if (params.parentId != null && params.parentId != 0) {
      filter.parentId = this._toObjectId(params.parentId);
    }
    if (params.deptName != null && params.deptName !== "") {
      filter.deptName = { $regex: params.deptName, $options: "i" };
    }
    if (params.status != null && params.status !== "") {
      filter.status = params.status;
    }

    // 数据范围条件（由 @DataScope 装饰器注入 mongoScope）
    if (params.params && params.params.mongoScope) {
      filter._mongoScope = params.params.mongoScope;
    }

    return filter;
  }

  // ==================== 查询列表 ====================

  /**
   * 查询部门列表
   * 对应 SysDeptMapper.xml 中 selectDeptList
   * @param {object} dept - 查询参数
   * @return {array} 部门列表
   */
  @DataScope({ deptAlias: "d" })
  async selectDeptList(dept = {}) {
    // 组装查询条件（与 MyBatis XML 中 selectDeptList 完全一致）
    const params = {
      deptId: dept.deptId,
      parentId: dept.parentId,
      deptName: dept.deptName,
      status: dept.status,
      params: dept.params || {},
    };

    const filter = this._buildDeptFilter(params);

    // 合并 mongoScope（来自 @DataScope 装饰器）
    const mongoScope = filter._mongoScope;
    delete filter._mongoScope;
    const queryFilter = mongoScope
      ? { $and: [filter, mongoScope] }
      : filter;

    const depts = await this.model.SysDept
      .find(queryFilter)
      .sort({ parentId: 1, orderNum: 1 })
      .lean();

    return (depts || []).map((d) => this._normalizeDept(d));
  }

  // ==================== 按角色查询部门 ====================

  /**
   * 根据角色ID查询部门ID列表
   * 对应 SysDeptMapper.xml 中 selectDeptListByRoleId
   */
  async selectDeptListByRoleId(roleId) {
    const { ctx } = this;

    // 查询角色信息
    const role = await ctx.service.system.role.selectRoleById(roleId);
    const deptCheckStrictly = role && role.deptCheckStrictly;

    // 查询角色关联的部门
    const roleDepts = await this.model.SysRoleDept
      .find({ roleId: this._toObjectId(roleId) })
      .select("deptId")
      .lean();

    let deptIds = roleDepts.map((rd) => rd.deptId);

    if (deptCheckStrictly && deptIds.length > 0) {
      // 排除父子关联：如果某个部门的 parentId 也在 deptIds 中，则排除该父部门
      const parentDepts = await this.model.SysDept
        .find({
          _id: { $in: deptIds },
          parentId: { $in: deptIds },
        })
        .select("parentId")
        .lean();

      const parentIdSet = new Set(
        parentDepts.map((d) => d.parentId.toString())
      );
      deptIds = deptIds.filter((id) => !parentIdSet.has(id.toString()));
    }

    if (deptIds.length === 0) return [];

    const depts = await this.model.SysDept
      .find({ _id: { $in: deptIds }, delFlag: "0" })
      .select("_id")
      .sort({ parentId: 1, orderNum: 1 })
      .lean();

    return depts.map((d) => ({ deptId: d._id, ...d }));
  }

  // ==================== 按 ID 查询 ====================

  /**
   * 根据部门ID查询部门
   * 对应 SysDeptMapper.xml 中 selectDeptById（含父部门名称子查询）
   */
  async selectDeptById(deptId) {
    const _id = this._toObjectId(deptId);
    const dept = await this.model.SysDept.findById(_id)
      .populate("parentId", "deptName")
      .lean();

    if (!dept) return null;

    return this._normalizeDept({
      ...dept,
      parentName: dept.parentId ? dept.parentId.deptName : null,
    });
  }

  // ==================== 按名称查询 ====================

  /**
   * 根据部门名称查询部门
   * @param {string} deptName - 部门名称
   * @return {object} 部门信息
   */
  async selectDeptByName(deptName) {
    if (!deptName) {
      return null;
    }

    const depts = await this.selectDeptList({ deptName });

    if (depts && depts.length > 0) {
      const exactMatch = depts.find((dept) => dept.deptName === deptName);
      return exactMatch || depts[0];
    }

    return null;
  }

  // ==================== 唯一性校验 ====================

  /**
   * 校验部门名称是否唯一
   * 对应 SysDeptMapper.xml 中 checkDeptNameUnique
   */
  async checkDeptNameUnique(dept) {
    const existing = await this.model.SysDept.findOne({
      deptName: dept.deptName,
      parentId: this._toObjectId(dept.parentId),
      delFlag: "0",
    }).lean();

    if (existing) {
      const deptId = dept.deptId || dept._id;
      if (!deptId || existing._id.toString() !== String(deptId)) {
        return false;
      }
    }

    return true;
  }

  // ==================== 子部门 / 用户检查 ====================

  /**
   * 是否存在子部门
   * 对应 SysDeptMapper.xml 中 hasChildByDeptId
   */
  async hasChildByDeptId(deptId) {
    const count = await this.model.SysDept.countDocuments({
      parentId: this._toObjectId(deptId),
      delFlag: "0",
    });
    return count > 0;
  }

  /**
   * 检查部门是否存在用户
   * 对应 SysDeptMapper.xml 中 checkDeptExistUser
   */
  async checkDeptExistUser(deptId) {
    const count = await this.model.SysUser.countDocuments({
      deptId: this._toObjectId(deptId),
      delFlag: "0",
    });
    return count > 0;
  }

  /**
   * 查询正常状态的子部门数量
   * 对应 SysDeptMapper.xml 中 selectNormalChildrenDeptById
   */
  async selectNormalChildrenDeptById(deptId) {
    const count = await this.model.SysDept.countDocuments({
      status: "0",
      delFlag: "0",
      ancestors: deptId,
    });
    return count;
  }

  // ==================== 树形构建 ====================

  /**
   * 查询部门树结构
   */
  async selectDeptTreeList(dept = {}) {
    const list = await this.selectDeptList(dept);
    return this.buildDeptTreeSelect(list);
  }

  /**
   * 构建部门树
   */
  buildDeptTree(depts) {
    const deptIds = depts.map((d) => String(d.deptId));
    const tree = [];
    depts.forEach((dept) => {
      if (!deptIds.includes(String(dept.parentId))) {
        this.recursionFn(depts, dept);
        tree.push(dept);
      }
    });
    return tree.length > 0 ? tree : depts;
  }

  /**
   * 递归查找子部门
   */
  recursionFn(depts, dept) {
    const childList = this.getChildList(depts, dept);
    dept.children = childList;
    for (const child of childList) {
      if (this.hasChild(depts, child)) {
        this.recursionFn(depts, child);
      }
    }
  }

  /**
   * 得到子节点列表
   * @param {array} list - 部门列表
   * @param {object} dept - 当前部门
   * @return {array} 子节点列表
   */
  getChildList(list, dept) {
    const childList = [];
    for (const item of list) {
      if (item.parentId && String(item.parentId) === String(dept.deptId)) {
        childList.push(item);
      }
    }
    return childList;
  }

  /**
   * 判断是否有子节点
   * @param {array} list - 部门列表
   * @param {object} dept - 当前部门
   * @return {boolean} 是否有子节点
   */
  hasChild(list, dept) {
    return this.getChildList(list, dept).length > 0;
  }

  /**
   * 构建部门树选择结构
   * @param {array} depts - 部门列表
   * @return {array} 树选择结构
   */
  buildDeptTreeSelect(depts) {
    const deptTree = this.buildDeptTree(depts);
    return this.convertToTreeSelect(deptTree);
  }

  /**
   * 转换为树选择结构
   * @param {array} depts - 部门树
   * @return {array} 树选择结构
   */
  convertToTreeSelect(depts) {
    const treeSelect = [];
    depts.forEach((dept) => {
      const node = { id: dept.deptId, label: dept.deptName };
      if (dept.children && dept.children.length > 0) {
        node.children = this.convertToTreeSelect(dept.children);
      }
      treeSelect.push(node);
    });
    return treeSelect;
  }

  // ==================== 新增 ====================

  /**
   * 新增部门
   * 对应 SysDeptMapper.xml 中 insertDept（动态字段）
   */
  async insertDept(dept) {
    const { ctx } = this;

    // 查询父部门信息
    const parentDept = dept.parentId
      ? await this.selectDeptById(dept.parentId)
      : null;

    // 如果父节点不为正常状态,则不允许新增子节点
    if (parentDept && parentDept.status !== "0") {
      throw new Error("部门停用，不允许新增");
    }

    // 设置祖级列表（ancestors 为数组：[0, 100, 101]）
    dept.ancestors = parentDept
      ? [...parentDept.ancestors, parentDept.deptId]
      : [0];

    // 设置创建信息
    dept.createBy = ctx.state.user.userName;

    // 动态构建文档字段
    const doc = {
      ancestors: dept.ancestors,
      createBy: dept.createBy,
      createTime: new Date(),
    };

    if (dept.parentId) doc.parentId = this._toObjectId(dept.parentId);
    if (dept.deptName) doc.deptName = dept.deptName;
    if (dept.orderNum != null) doc.orderNum = dept.orderNum;
    if (dept.leader) doc.leader = dept.leader;
    if (dept.phone) doc.phone = dept.phone;
    if (dept.email) doc.email = dept.email;
    if (dept.status != null && dept.status !== "") doc.status = dept.status;

    await this.model.SysDept.create(doc);

    return 1;
  }

  // ==================== 修改 ====================

  /**
   * 修改部门
   * 对应 SysDeptMapper.xml 中 updateDept（动态 SET）
   */
  async updateDept(dept) {
    const { ctx } = this;

    // 查询新父部门信息
    const newParentDept = dept.parentId
      ? await this.selectDeptById(dept.parentId)
      : null;

    // 查询旧部门信息
    const oldDept = await this.selectDeptById(dept.deptId);

    if (newParentDept && oldDept) {
      const newAncestors = [...newParentDept.ancestors, newParentDept.deptId];
      const oldAncestors = oldDept.ancestors;

      dept.ancestors = newAncestors;

      // 更新子部门的祖级列表
      await this.updateDeptChildren(dept.deptId, newAncestors, oldAncestors);
    }

    // 设置更新信息
    dept.updateBy = ctx.state.user.userName;

    // 动态构建 $set 字段
    const setFields = { updateTime: new Date() };

    if (dept.parentId != null && dept.parentId != 0) {
      setFields.parentId = this._toObjectId(dept.parentId);
    }
    if (dept.deptName != null && dept.deptName !== "") {
      setFields.deptName = dept.deptName;
    }
    if (dept.ancestors != null && dept.ancestors !== "") {
      setFields.ancestors = Array.isArray(dept.ancestors)
        ? dept.ancestors
        : dept.ancestors;
    }
    if (dept.orderNum != null) setFields.orderNum = dept.orderNum;
    if (dept.leader != null) setFields.leader = dept.leader;
    if (dept.phone != null) setFields.phone = dept.phone;
    if (dept.email != null) setFields.email = dept.email;
    if (dept.status != null && dept.status !== "") setFields.status = dept.status;
    if (dept.updateBy != null && dept.updateBy !== "") {
      setFields.updateBy = dept.updateBy;
    }

    const _id = this._toObjectId(dept.deptId);
    const result = await this.model.SysDept.updateOne(
      { _id },
      { $set: setFields }
    );

    // 如果该部门是启用状态，则启用该部门的所有上级部门
    if (dept.status === "0" && dept.ancestors && Array.isArray(dept.ancestors)) {
      const hasRealAncestors = dept.ancestors.some((id) => id !== 0 && id !== "0");
      if (hasRealAncestors) {
        await this.updateParentDeptStatusNormal(dept);
      }
    }

    return result.modifiedCount;
  }

  /**
   * 更新子部门的祖级列表
   * 对应 XML: selectChildrenDeptById + updateDeptChildren（CASE WHEN 批量更新）
   */
  async updateDeptChildren(deptId, newAncestors, oldAncestors) {
    // 查询所有子部门（ancestors 包含该 deptId 的部门）
    const children = await this.model.SysDept
      .find({ ancestors: { $elemMatch: { $eq: deptId } }, delFlag: "0" })
      .lean();

    if (children.length === 0) return;

    // 更新每个子部门的祖级列表：替换 oldAncestors 前缀为 newAncestors
    const bulkOps = children.map((child) => {
      // 找到 oldAncestors 在 child.ancestors 中的位置并替换
      const oldLen = oldAncestors.length;
      const newChildAncestors = [
        ...newAncestors,
        ...child.ancestors.slice(oldLen),
      ];

      return {
        updateOne: {
          filter: { _id: child._id },
          update: { $set: { ancestors: newChildAncestors } },
        },
      };
    });

    if (bulkOps.length > 0) {
      await this.model.SysDept.bulkWrite(bulkOps);
    }
  }

  /**
   * 更新上级部门状态为正常
   * 对应 XML: updateDeptStatusNormal（IN 批量更新）
   */
  async updateParentDeptStatusNormal(dept) {
    // 获取所有上级部门ID（ancestors 已是数组，过滤掉 0）
    const ancestorIds = dept.ancestors.filter((id) => id !== 0 && id !== "0");

    if (ancestorIds.length === 0) {
      return;
    }

    await this.model.SysDept.updateMany(
      { _id: { $in: ancestorIds } },
      { $set: { status: "0" } }
    );
  }

  // ==================== 删除 ====================

  /**
   * 删除部门（软删除）
   * 对应 SysDeptMapper.xml 中 deleteDeptById
   */
  async deleteDeptById(deptId) {
    const _id = this._toObjectId(deptId);
    const result = await this.model.SysDept.updateOne(
      { _id },
      { $set: { delFlag: "2" } }
    );
    return result.modifiedCount;
  }

  // ==================== 权限校验 ====================

  /**
   * 校验部门数据权限
   */
  async checkDeptDataScope(deptId) {
    const { ctx } = this;

    if (!deptId) {
      return;
    }

    // 管理员拥有所有数据权限（isAdmin 现在接受 user 对象）
    if (ctx.helper.isAdmin(ctx.state.user)) {
      return;
    }

    // 使用带数据权限的查询来验证当前用户是否有权限访问该部门
    const depts = await this.selectDeptList({ deptId });

    if (!depts || depts.length === 0) {
      throw new Error("没有权限访问部门数据！");
    }
  }
}

module.exports = DeptService;
