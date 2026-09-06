/*
 * @Description: 角色服务层（MongoDB/Mongoose 版本）
 * @Author: AI Assistant
 * @Date: 2025-10-23
 */

const Service = require("egg").Service;
const { DataScope } = require("../../decorator/dataScope");

class RoleService extends Service {
  constructor(...args) {
    super(...args);
    /**
     * 角色查询字段（原 MySQL 版本 selectRoleVo，供参考）
     * SELECT DISTINCT r.role_id, r.role_name, r.role_key, r.role_sort,
     *   r.data_scope, r.menu_check_strictly, r.dept_check_strictly,
     *   r.status, r.del_flag, r.create_time, r.remark
     */
    /**
     * FROM + JOIN 子句（原 MySQL 版本，供参考）
     * FROM sys_role r
     *   LEFT JOIN sys_user_role ur ON ur.role_id = r.role_id
     *   LEFT JOIN sys_user u ON u.user_id = ur.user_id
     *   LEFT JOIN sys_dept d ON u.dept_id = d.dept_id
     */
  }

  /** 获取模型快捷访问 */
  get model() {
    return this.ctx.model;
  }

  /** 将字符串 ID 转换为 Mongoose ObjectId */
  _toObjectId(id) {
    if (!id) return null;
    if (id instanceof this.app.mongoose.Types.ObjectId) return id;
    return new this.app.mongoose.Types.ObjectId(String(id));
  }

  /** 批量转换 ID 为 ObjectId 数组 */
  _toObjectIds(ids) {
    if (!ids || !ids.length) return [];
    return ids.map(id => this._toObjectId(id));
  }

  /**
   * 构建角色查询 Filter（对应原 _buildSelectRoleListSql）
   * @param {object} params - 查询参数
   * @return {object} MongoDB filter
   */
  _buildRoleFilter(params) {
    const filter = { delFlag: '0' };

    if (params.roleId != null && params.roleId != 0 && params.roleId !== '') {
      filter._id = this._toObjectId(params.roleId);
    }
    if (params.roleName != null && params.roleName !== '') {
      filter.roleName = { $regex: params.roleName, $options: 'i' };
    }
    if (params.status != null && params.status !== '') {
      filter.status = String(params.status);
    }
    if (params.roleKey != null && params.roleKey !== '') {
      filter.roleKey = { $regex: params.roleKey, $options: 'i' };
    }

    // 时间范围
    const beginTime = (params.params && params.params.beginTime) || params['params[beginTime]'];
    const endTime = (params.params && params.params.endTime) || params['params[endTime]'];
    if (beginTime) {
      filter.createTime = filter.createTime || {};
      filter.createTime.$gte = new Date(beginTime);
    }
    if (endTime) {
      filter.createTime = filter.createTime || {};
      filter.createTime.$lte = new Date(endTime);
    }

    // 数据范围条件（由 @DataScope 装饰器注入 mongoScope）
    if (params.params && params.params.mongoScope) {
      filter._mongoScope = params.params.mongoScope;
    }

    return filter;
  }

  /**
   * 查询所有角色
   * 对应 SysRoleMapper.xml 中 selectRoleAll
   * @return {array} 角色列表
   */
  async selectRoleAll() {
    const list = await this.model.SysRole.find().lean() || [];
    return this.ctx.helper.normalizeIds(list, 'roleId');
  }

  /**
   * 根据用户ID查询角色列表
   * @param {string|ObjectId} userId - 用户ID
   * @return {array} 角色列表（含 flag 标记）
   */
  async selectRolesByUserId(userId) {
    const uid = this._toObjectId(userId);

    // 查询用户拥有的角色——对应 selectRolePermissionByUserId
    const userRoles = await this.model.SysUserRole.find({ userId: uid }).lean();
    const userRoleIdSet = new Set(userRoles.map(ur => ur.roleId.toString()));

    // 查询所有角色——对应 selectRoleAll
    const roles = await this.selectRoleAll();

    // 遍历所有角色，标记用户拥有的角色
    for (const role of roles) {
      if (userRoleIdSet.has(role._id.toString())) {
        role.flag = true;
      }
    }

    return roles;
  }

  /**
   * 分页查询角色列表（带数据权限过滤）
   * @param {object} role - 查询参数
   * @return {object} 分页结果
   */
  @DataScope({ deptAlias: "d" })
  async selectRolePage(role = {}) {
    // 确保包含 params 参数
    const conditions = {
      ...role,
      params: role.params || {},
    };

    const filter = this._buildRoleFilter(conditions);
    const mongoScope = filter._mongoScope;
    delete filter._mongoScope;

    // 合并 DataScope 条件
    const queryFilter = mongoScope
      ? { $and: [filter, mongoScope] }
      : filter;

    return await this.ctx.helper.pageQueryMongo(
      this.model.SysRole,
      queryFilter,
      conditions,
      { sort: { roleSort: 1 }, idField: 'roleId' }
    );
  }

  /**
   * 查询角色列表（带数据权限过滤）
   * @param {object} role - 查询参数
   * @return {array} 角色列表
   */
  @DataScope({ deptAlias: "d" })
  async selectRoleList(role = {}) {
    // 组装查询条件（与 MyBatis XML 中 selectRoleList 完全一致）
    const conditions = {
      roleId: role.roleId,
      roleName: role.roleName,
      roleKey: role.roleKey,
      status: role.status,
      params: role.params || {
        beginTime: role.beginTime,
        endTime: role.endTime,
      },
    };

    const filter = this._buildRoleFilter(conditions);
    const mongoScope = filter._mongoScope;
    delete filter._mongoScope;

    const queryFilter = mongoScope
      ? { $and: [filter, mongoScope] }
      : filter;

    const list = await this.model.SysRole
      .find(queryFilter)
      .sort({ roleSort: 1 })
      .lean() || [];
    return this.ctx.helper.normalizeIds(list, 'roleId');
  }

  /**
   * 根据角色ID查询角色
   * @param {number} roleId - 角色ID
   * @return {object} 角色信息
   */
  async selectRoleById(roleId) {
    const doc = await this.model.SysRole
      .findOne({ _id: this._toObjectId(roleId) })
      .lean();
    if (doc && doc._id != null) doc.roleId = doc._id;
    return doc;
  }

  /**
   * 校验角色名称是否唯一
   * @param {object} role - 角色对象
   * @return {boolean} true-唯一 false-不唯一
   */
  async checkRoleNameUnique(role) {
    const roleId = role._id || (role.roleId ? this._toObjectId(role.roleId) : null);
    const result = await this.model.SysRole
      .findOne({ roleName: role.roleName, delFlag: '0' })
      .lean();

    if (result && (!roleId || result._id.toString() !== roleId.toString())) {
      return false;
    }

    return true;
  }

  /**
   * 校验角色权限字符是否唯一
   * @param {object} role - 角色对象
   * @return {boolean} true-唯一 false-不唯一
   */
  async checkRoleKeyUnique(role) {
    const roleId = role._id || (role.roleId ? this._toObjectId(role.roleId) : null);
    const result = await this.model.SysRole
      .findOne({ roleKey: role.roleKey, delFlag: '0' })
      .lean();

    if (result && (!roleId || result._id.toString() !== roleId.toString())) {
      return false;
    }

    return true;
  }

  /**
   * 校验角色是否允许操作
   * @param {object} role - 角色对象
   */
  checkRoleAllowed(role) {
    // isAdmin 现在接受用户对象（检查 userName === 'admin'）
    // 对于角色，直接检查 roleKey 是否为 'admin'
    if (role._id && role.roleKey === 'admin') {
      throw new Error("不允许操作超级管理员角色");
    }
  }

  /**
   * 校验角色是否有数据权限
   * @param {string|ObjectId} roleId - 角色ID
   */
  async checkRoleDataScope(roleId) {
    const { ctx } = this;

    // 管理员拥有所有数据权限（isAdmin 接受用户对象）
    if (ctx.helper.isAdmin(ctx.state.user)) {
      return;
    }

    // 查询角色是否在当前用户的数据权限范围内
    const role = await this.selectRoleById(roleId);
    if (!role) {
      throw new Error("没有权限访问角色数据！");
    }
  }

  /**
   * 新增角色
   * @param {object} role - 角色对象
   * @return {number} 1-成功 0-失败
   */
  async insertRole(role) {
    const { ctx } = this;

    // 构建角色文档（动态字段，对应 XML <if test="..."> 逻辑）
    const roleDoc = {};

    if (role.roleName != null && role.roleName !== '') {
      roleDoc.roleName = role.roleName;
    }
    if (role.roleKey != null && role.roleKey !== '') {
      roleDoc.roleKey = role.roleKey;
    }
    if (role.roleSort != null) {
      roleDoc.roleSort = Number(role.roleSort);
    }
    if (role.dataScope != null && role.dataScope !== '') {
      roleDoc.dataScope = role.dataScope;
    }
    if (role.menuCheckStrictly != null) {
      roleDoc.menuCheckStrictly = role.menuCheckStrictly === true || role.menuCheckStrictly === 1;
    }
    if (role.deptCheckStrictly != null) {
      roleDoc.deptCheckStrictly = role.deptCheckStrictly === true || role.deptCheckStrictly === 1;
    }
    if (role.status != null && role.status !== '') {
      roleDoc.status = String(role.status);
    }
    if (role.remark != null) {
      roleDoc.remark = role.remark;
    }

    // 设置创建信息
    roleDoc.createBy = ctx.state.user.userName;

    const result = await this.model.SysRole.create(roleDoc);

    if (result) {
      // 插入角色与菜单关联
      if (role.menuIds && role.menuIds.length > 0) {
        await this.insertRoleMenu(result._id, role.menuIds);
      }

      return 1;
    }

    return 0;
  }

  /**
   * 修改角色
   * @param {object} role - 角色对象
   * @return {number} 影响行数（modifiedCount）
   */
  async updateRole(role) {
    const { ctx } = this;

    const roleId = role._id
      ? this._toObjectId(role._id)
      : this._toObjectId(role.roleId);

    // 动态构建 $set——对应 XML <set> + <if test="..."> 逻辑
    const $set = {};

    if (role.roleName != null && role.roleName !== '') {
      $set.roleName = role.roleName;
    }
    if (role.roleKey != null && role.roleKey !== '') {
      $set.roleKey = role.roleKey;
    }
    if (role.roleSort != null) {
      $set.roleSort = Number(role.roleSort);
    }
    if (role.dataScope != null && role.dataScope !== '') {
      $set.dataScope = role.dataScope;
    }
    if (role.menuCheckStrictly != null) {
      $set.menuCheckStrictly = role.menuCheckStrictly === true || role.menuCheckStrictly === 1;
    }
    if (role.deptCheckStrictly != null) {
      $set.deptCheckStrictly = role.deptCheckStrictly === true || role.deptCheckStrictly === 1;
    }
    if (role.status != null && role.status !== '') {
      $set.status = String(role.status);
    }
    if (role.remark != null) {
      $set.remark = role.remark;
    }
    if (role.updateBy != null && role.updateBy !== '') {
      $set.updateBy = role.updateBy;
    } else if (ctx.state.user && ctx.state.user.userName) {
      $set.updateBy = ctx.state.user.userName;
    }
    // updateTime 对应原 sysdate()
    $set.updateTime = new Date();

    const result = await this.model.SysRole.updateOne(
      { _id: roleId },
      { $set }
    );

    // 删除角色与菜单关联——对应 deleteRoleMenuByRoleId
    await this.model.SysRoleMenu.deleteMany({ roleId });

    // 插入角色与菜单关联
    if (role.menuIds && role.menuIds.length > 0) {
      await this.insertRoleMenu(roleId, role.menuIds);
    }

    return result.modifiedCount;
  }

  /**
   * 修改角色状态
   * @param {object} role - 角色对象
   * @return {number} 影响行数
   */
  async updateRoleStatus(role) {
    return await this.updateRole(role);
  }

  /**
   * 修改数据权限
   * @param {object} role - 角色对象
   * @return {number} 影响行数
   */
  async authDataScope(role) {
    const { ctx } = this;

    const roleId = role._id
      ? this._toObjectId(role._id)
      : this._toObjectId(role.roleId);

    // 动态构建 $set——复用 updateRole 的逻辑
    const $set = {};

    if (role.roleName != null && role.roleName !== '') {
      $set.roleName = role.roleName;
    }
    if (role.roleKey != null && role.roleKey !== '') {
      $set.roleKey = role.roleKey;
    }
    if (role.roleSort != null) {
      $set.roleSort = Number(role.roleSort);
    }
    if (role.dataScope != null && role.dataScope !== '') {
      $set.dataScope = role.dataScope;
    }
    if (role.menuCheckStrictly != null) {
      $set.menuCheckStrictly = role.menuCheckStrictly === true || role.menuCheckStrictly === 1;
    }
    if (role.deptCheckStrictly != null) {
      $set.deptCheckStrictly = role.deptCheckStrictly === true || role.deptCheckStrictly === 1;
    }
    if (role.status != null && role.status !== '') {
      $set.status = String(role.status);
    }
    if (role.remark != null) {
      $set.remark = role.remark;
    }
    if (role.updateBy != null && role.updateBy !== '') {
      $set.updateBy = role.updateBy;
    } else if (ctx.state.user && ctx.state.user.userName) {
      $set.updateBy = ctx.state.user.userName;
    }
    $set.updateTime = new Date();

    const result = await this.model.SysRole.updateOne(
      { _id: roleId },
      { $set }
    );

    // 删除角色与部门关联——对应 deleteRoleDeptByRoleId
    await this.model.SysRoleDept.deleteMany({ roleId });

    // 插入角色与部门关联
    if (role.deptIds && role.deptIds.length > 0) {
      await this.insertRoleDept(roleId, role.deptIds);
    }

    return result.modifiedCount;
  }

  /**
   * 删除角色
   * @param {array} roleIds - 角色ID数组
   * @return {number} 影响行数
   */
  async deleteRoleByIds(roleIds) {
    const objIds = this._toObjectIds(roleIds);

    // 删除角色与菜单关联——对应 deleteRoleMenu
    await this.model.SysRoleMenu.deleteMany({ roleId: { $in: objIds } });

    // 删除角色与部门关联——对应 deleteRoleDept
    await this.model.SysRoleDept.deleteMany({ roleId: { $in: objIds } });

    // 删除角色（软删除）——对应 deleteRoleByIds
    const result = await this.model.SysRole.updateMany(
      { _id: { $in: objIds } },
      { $set: { delFlag: '2' } }
    );

    return result.modifiedCount;
  }

  /**
   * 取消授权用户
   * @param {object} userRole - 用户角色对象
   * @return {number} 影响行数
   */
  async deleteAuthUser(userRole) {
    const result = await this.model.SysUserRole.deleteOne({
      userId: this._toObjectId(userRole.userId),
      roleId: this._toObjectId(userRole.roleId),
    });

    return result.deletedCount;
  }

  /**
   * 批量取消授权用户
   * @param {string|ObjectId} roleId - 角色ID
   * @param {array} userIds - 用户ID数组
   * @return {number} 影响行数
   */
  async deleteAuthUsers(roleId, userIds) {
    const result = await this.model.SysUserRole.deleteMany({
      roleId: this._toObjectId(roleId),
      userId: { $in: this._toObjectIds(userIds) },
    });

    return result.deletedCount;
  }

  /**
   * 批量授权用户
   * @param {string|ObjectId} roleId - 角色ID
   * @param {array} userIds - 用户ID数组
   * @return {number} 成功数量
   */
  async insertAuthUsers(roleId, userIds) {
    if (!userIds || userIds.length === 0) {
      return 0;
    }

    const objRoleId = this._toObjectId(roleId);
    const docs = userIds.map(userId => ({
      userId: this._toObjectId(userId),
      roleId: objRoleId,
    }));

    await this.model.SysUserRole.insertMany(docs);

    return userIds.length;
  }

  /**
   * 插入角色与菜单关联
   * @param {string|ObjectId} roleId - 角色ID
   * @param {array} menuIds - 菜单ID数组
   */
  async insertRoleMenu(roleId, menuIds) {
    if (!menuIds || menuIds.length === 0) {
      return;
    }

    const objRoleId = this._toObjectId(roleId);
    const docs = menuIds.map(menuId => ({
      roleId: objRoleId,
      menuId: this._toObjectId(menuId),
    }));

    await this.model.SysRoleMenu.insertMany(docs);
  }

  /**
   * 插入角色与部门关联
   * @param {string|ObjectId} roleId - 角色ID
   * @param {array} deptIds - 部门ID数组
   */
  async insertRoleDept(roleId, deptIds) {
    if (!deptIds || deptIds.length === 0) {
      return;
    }

    const objRoleId = this._toObjectId(roleId);
    const docs = deptIds.map(deptId => ({
      roleId: objRoleId,
      deptId: this._toObjectId(deptId),
    }));

    await this.model.SysRoleDept.insertMany(docs);
  }
}

module.exports = RoleService;
