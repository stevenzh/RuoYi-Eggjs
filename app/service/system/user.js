/*
 * @Description: 用户服务层（MongoDB/Mongoose 版本）
 * @Author: AI Assistant
 * @Date: 2025-10-23
 */

const Service = require("egg").Service;
const { DataScope } = require("../../decorator/dataScope");

class UserService extends Service {
  /** 获取模型快捷访问 */
  get model() {
    return this.ctx.model;
  }

  // ==================== 数据规范化 ====================

  /**
   * 将 Mongoose 文档的 _id 映射为 userId，保持与前端兼容
   */
  _normalizeUser(user) {
    if (!user) return user;
    const normalized = { ...user, userId: user._id };
    if (user.deptId && typeof user.deptId === 'object' && user.deptId._id) {
      normalized.dept = user.deptId;
    }
    return normalized;
  }

  _normalizeUserList(users) {
    if (!users || !Array.isArray(users)) return users;
    return users.map(u => this._normalizeUser(u));
  }

  // ==================== 查询辅助 ====================

  /**
   * 构建用户查询条件（对应原 _buildSelectUserListSql）
   */
  _buildUserFilter(params) {
    const filter = { delFlag: '0' };

    if (params.userId) {
      filter._id = typeof params.userId === 'string'
        ? new this.app.mongoose.Types.ObjectId(params.userId)
        : params.userId;
    }
    if (params.userName) {
      filter.userName = { $regex: params.userName, $options: 'i' };
    }
    if (params.status != null && params.status !== '') {
      filter.status = params.status;
    }
    if (params.phonenumber) {
      filter.phonenumber = { $regex: params.phonenumber, $options: 'i' };
    }

    // 时间范围
    const beginTime = (params.params && params.params.beginTime) || params.beginTime;
    const endTime = (params.params && params.params.endTime) || params.endTime;
    if (beginTime) {
      filter.createTime = filter.createTime || {};
      filter.createTime.$gte = new Date(beginTime);
    }
    if (endTime) {
      filter.createTime = filter.createTime || {};
      filter.createTime.$lte = new Date(endTime);
    }

    // 部门筛选
    if (params.deptId) {
      // 查询该部门及其所有子部门
      filter.$or = [
        { deptId: params.deptId },
      ];
    }

    // 数据范围条件（由 @DataScope 装饰器注入）
    if (params.params && params.params.mongoScope) {
      // mongoScope 需要与现有条件 $and 合并
      filter._mongoScope = params.params.mongoScope;
    }

    return filter;
  }

  // ==================== 分页查询 ====================

  /**
   * 查询用户列表（分页，带数据权限过滤）
   */
  @DataScope({ deptAlias: "d", userAlias: "u" })
  async selectUserPage(params = {}) {
    const filter = this._buildUserFilter(params);

    // 部门子查询：如果指定了 deptId，查其所有子部门ID并加入 $in
    if (params.deptId) {
      const deptIds = await this._getDeptAndChildrenIds(params.deptId);
      if (deptIds.length > 0) {
        filter.deptId = { $in: deptIds };
      }
    }

    // 处理 mongoScope
    const mongoScope = filter._mongoScope;
    delete filter._mongoScope;

    // 合并 mongoScope
    const queryFilter = mongoScope
      ? { $and: [filter, mongoScope] }
      : filter;

    const result = await this.ctx.helper.pageQueryMongo(
      this.model.SysUser,
      queryFilter,
      params,
      { populate: 'deptId', sort: { createTime: -1 }, idField: 'userId' }
    );

    return result;
  }

  // ==================== 查询列表 ====================

  /**
   * 查询用户列表（带数据权限过滤）
   */
  @DataScope({ deptAlias: "d", userAlias: "u" })
  async selectUserList(params = {}) {
    const filter = this._buildUserFilter(params);
    const mongoScope = filter._mongoScope;
    delete filter._mongoScope;

    const queryFilter = mongoScope
      ? { $and: [filter, mongoScope] }
      : filter;

    const users = await this.model.SysUser
      .find(queryFilter)
      .populate('deptId')
      .lean();

    return this._normalizeUserList(users);
  }

  /**
   * 根据用户ID查询用户（包含部门和角色信息）
   */
  async selectUserById(userId) {
    const _id = typeof userId === 'string'
      ? new this.app.mongoose.Types.ObjectId(userId)
      : userId;

    const user = await this.model.SysUser
      .findById(_id)
     // .populate('deptId')
      .lean();

    if (!user) return null;

    return this._normalizeUser(await this.selectUserWithDeptAndRoles(user));
  }

  /**
   * 根据用户名查询角色列表
   */
  async selectRolesByUserName(userName) {
    if (!userName) {
      return { roles: [], roleIds: [] };
    }

    const user = await this.model.SysUser.findOne({ userName, delFlag: '0' }).lean();
    if (!user) return { roles: [], roleIds: [] };

    const userRoles = await this.model.SysUserRole.find({ userId: user._id }).lean();
    const roleIds = userRoles.map(ur => ur.roleId);
    const roles = roleIds.length > 0
      ? await this.model.SysRole.find({ _id: { $in: roleIds }, delFlag: '0' }).lean()
      : [];

    return { roles, roleIds: roleIds.map(id => id.toString()) };
  }

  /**
   * 查询用户详情（包含部门和角色）
   */
  async selectUserWithDeptAndRoles(user) {
    if (!user || !user.userName) return null;

    const { roles, roleIds } = await this.selectRolesByUserName(user.userName);

    return {
      ...user,
      dept: user.deptId || null,
      roles,
      roleIds,
    };
  }

  /**
   * 根据用户名查询用户
   */
  async selectUserByUserName(userName) {
    const user = await this.model.SysUser
      .findOne({ userName, delFlag: '0' })
      .populate('deptId')
      .lean();
    return this._normalizeUser(user);
  }

  // ==================== 唯一性校验 ====================

  async checkUserNameUnique(user) {
    const existing = await this.model.SysUser.findOne({
      userName: user.userName,
      delFlag: '0',
    }).lean();

    return !existing || existing._id.toString() === (user.userId || user._id);
  }

  async checkPhoneUnique(user) {
    const existing = await this.model.SysUser.findOne({
      phonenumber: user.phonenumber,
      delFlag: '0',
    }).lean();

    return !existing || existing._id.toString() === (user.userId || user._id);
  }

  async checkEmailUnique(user) {
    const existing = await this.model.SysUser.findOne({
      email: user.email,
      delFlag: '0',
    }).lean();

    return !existing || existing._id.toString() === (user.userId || user._id);
  }

  // ==================== 部门查询 ====================

  async selectDeptByDeptId(deptId) {
    if (!deptId) return null;
    return await this.ctx.service.system.dept.selectDeptById(deptId);
  }

  /**
   * 获取部门及其所有子部门ID
   */
  async _getDeptAndChildrenIds(deptId) {
    const dept = await this.model.SysDept.findById(deptId).lean();
    if (!dept) return [deptId];

    // 查找 ancestors 包含该 deptId 的所有部门
    const children = await this.model.SysDept
      .find({ ancestors: deptId, delFlag: '0' })
      .select('_id')
      .lean();

    return [deptId, ...children.map(d => d._id)];
  }

  // ==================== 校验 ====================

  checkUserAllowed(user) {
    if (user && this.ctx.helper.isAdmin(user._id ? user.userName : user)) {
      throw new Error("不允许操作超级管理员用户");
    }
  }

  async checkUserDataScope(userId) {
    const { ctx } = this;
    if (ctx.helper.isAdmin(ctx.state.user)) return;
    // TODO: 实现数据权限校验
  }

  // ==================== 新增 ====================

  async insertUser(user) {
    const { ctx } = this;
    user.createBy = ctx.state.user.userName;

    const doc = {
      createBy: user.createBy,
      createTime: new Date(),
    };

    // 动态设置字段（非空才设置）
    if (user.deptId) doc.deptId = user.deptId;
    if (user.userName) doc.userName = user.userName;
    if (user.nickName) doc.nickName = user.nickName;
    if (user.email) doc.email = user.email;
    if (user.avatar) doc.avatar = user.avatar;
    if (user.phonenumber) doc.phonenumber = user.phonenumber;
    if (user.sex) doc.sex = user.sex;
    if (user.password) doc.password = user.password;
    if (user.status) doc.status = user.status;
    if (user.pwdUpdateDate) doc.pwdUpdateDate = user.pwdUpdateDate;
    if (user.remark) doc.remark = user.remark;

    const newUser = await this.model.SysUser.create(doc);

    // 插入用户与岗位关联
    if (user.postIds && user.postIds.length > 0) {
      await this.insertUserPost(newUser._id, user.postIds);
    }

    // 插入用户与角色关联
    if (user.roleIds && user.roleIds.length > 0) {
      await this.insertUserRole(newUser._id, user.roleIds);
    }

    return 1;
  }

  // ==================== 修改 ====================

  async updateUser(user) {
    const { ctx } = this;
    user.updateBy = ctx.state.user.userName;

    const setFields = { updateTime: new Date() };

    if (user.deptId != null) setFields.deptId = user.deptId;
    if (user.nickName) setFields.nickName = user.nickName;
    if (user.email !== undefined) setFields.email = user.email;
    if (user.phonenumber !== undefined) setFields.phonenumber = user.phonenumber;
    if (user.sex) setFields.sex = user.sex;
    if (user.avatar) setFields.avatar = user.avatar;
    if (user.password) setFields.password = user.password;
    if (user.status) setFields.status = user.status;
    if (user.loginIp) setFields.loginIp = user.loginIp;
    if (user.loginDate) setFields.loginDate = user.loginDate;
    if (user.updateBy) setFields.updateBy = user.updateBy;
    if (user.remark !== undefined) setFields.remark = user.remark;

    const _id = this._toObjectId(user.userId || user._id);

    // 更新角色关联
    await this.model.SysUserRole.deleteMany({ userId: _id });
    if (user.roleIds && user.roleIds.length > 0) {
      await this.insertUserRole(_id, user.roleIds);
    }

    // 更新岗位关联
    await this.model.SysUserPost.deleteMany({ userId: _id });
    if (user.postIds && user.postIds.length > 0) {
      await this.insertUserPost(_id, user.postIds);
    }

    const result = await this.model.SysUser.updateOne(
      { _id },
      { $set: setFields }
    );

    return result.modifiedCount;
  }

  async updateUserStatus(user) {
    const _id = this._toObjectId(user.userId || user._id);
    const result = await this.model.SysUser.updateOne(
      { _id },
      { $set: { status: user.status, updateTime: new Date() } }
    );
    return result.modifiedCount;
  }

  async resetPwd(user) {
    const _id = this._toObjectId(user.userId || user._id);
    const result = await this.model.SysUser.updateOne(
      { _id },
      { $set: { password: user.password, pwdUpdateDate: new Date(), updateTime: new Date() } }
    );
    return result.modifiedCount;
  }

  // ==================== 删除 ====================

  async deleteUserByIds(userIds) {
    const ids = userIds.map(id => this._toObjectId(id));

    // 删除关联记录
    await this.model.SysUserRole.deleteMany({ userId: { $in: ids } });
    await this.model.SysUserPost.deleteMany({ userId: { $in: ids } });

    // 软删除
    const result = await this.model.SysUser.updateMany(
      { _id: { $in: ids } },
      { $set: { delFlag: '2', updateTime: new Date() } }
    );
    return result.modifiedCount;
  }

  // ==================== 授权管理 ====================

  async insertUserAuth(userId, roleIds) {
    const _id = this._toObjectId(userId);
    await this.model.SysUserRole.deleteMany({ userId: _id });
    await this.insertUserRole(_id, roleIds);
  }

  async insertUserRole(userId, roleIds) {
    if (!roleIds || roleIds.length === 0) return;
    const docs = roleIds.map(roleId => ({
      userId: this._toObjectId(userId),
      roleId: this._toObjectId(roleId),
    }));
    await this.model.SysUserRole.insertMany(docs);
  }

  async insertUserPost(userId, postIds) {
    if (!postIds || postIds.length === 0) return;
    const docs = postIds.map(postId => ({
      userId: this._toObjectId(userId),
      postId: this._toObjectId(postId),
    }));
    await this.model.SysUserPost.insertMany(docs);
  }

  // ==================== 导入 ====================

  async importUser(userList, updateSupport = false, operName) {
    const { ctx } = this;

    if (!userList || userList.length === 0) {
      throw new Error("导入用户数据不能为空");
    }

    let successNum = 0;
    let failureNum = 0;
    const failureMsg = [];

    for (const user of userList) {
      try {
        if (user.deptName) {
          const dept = await ctx.service.system.dept.selectDeptByName(user.deptName);
          if (dept) user.deptId = dept._id;
        }

        const existUser = await this.selectUserByUserName(user.userName);

        if (!existUser) {
          user.password = await ctx.helper.security.encryptPassword(
            user.password || "123456"
          );
          user.createBy = operName;
          await this.insertUser(user);
          successNum++;
        } else if (updateSupport) {
          user.userId = existUser._id;
          user.updateBy = operName;
          await this.updateUserProfile(user);
          successNum++;
        } else {
          failureNum++;
          failureMsg.push(`用户 ${user.userName} 已存在`);
        }
      } catch (err) {
        failureNum++;
        failureMsg.push(`用户 ${user.userName} 导入失败：${err.message}`);
      }
    }

    if (failureNum > 0) {
      return `导入成功 ${successNum} 条，失败 ${failureNum} 条：${failureMsg.join("; ")}`;
    }
    return `导入成功 ${successNum} 条`;
  }

  // ==================== 个人中心 ====================

  async updateUserProfile(user) {
    const { ctx } = this;
    user.updateBy = ctx.state.user.userName;

    const setFields = { updateTime: new Date() };

    if (user.deptId != null) setFields.deptId = user.deptId;
    if (user.nickName) setFields.nickName = user.nickName;
    if (user.email !== undefined) setFields.email = user.email;
    if (user.phonenumber !== undefined) setFields.phonenumber = user.phonenumber;
    if (user.sex) setFields.sex = user.sex;
    if (user.avatar) setFields.avatar = user.avatar;
    if (user.password) setFields.password = user.password;
    if (user.status) setFields.status = user.status;
    if (user.loginIp) setFields.loginIp = user.loginIp;
    if (user.loginDate) setFields.loginDate = user.loginDate;
    if (user.updateBy) setFields.updateBy = user.updateBy;
    if (user.remark !== undefined) setFields.remark = user.remark;

    const _id = this._toObjectId(user.userId || user._id);
    const result = await this.model.SysUser.updateOne({ _id }, { $set: setFields });
    return result.modifiedCount;
  }

  async resetUserPwd(userId, password) {
    const _id = this._toObjectId(userId);
    const result = await this.model.SysUser.updateOne(
      { _id },
      { $set: { password, pwdUpdateDate: new Date(), updateTime: new Date() } }
    );
    return result.modifiedCount;
  }

  async updateUserAvatar(userId, avatar) {
    const _id = this._toObjectId(userId);
    const result = await this.model.SysUser.updateOne(
      { _id },
      { $set: { avatar, updateTime: new Date() } }
    );
    return result.modifiedCount > 0;
  }

  async selectUserRoleGroup(userName) {
    const { roles } = await this.selectRolesByUserName(userName);
    return roles.map(r => r.roleName).join(',');
  }

  async selectUserPostGroup(userName) {
    const user = await this.model.SysUser.findOne({ userName, delFlag: '0' }).lean();
    if (!user) return '';

    const userPosts = await this.model.SysUserPost.find({ userId: user._id }).lean();
    const postIds = userPosts.map(up => up.postId);
    if (postIds.length === 0) return '';

    const posts = await this.model.SysPost.find({ _id: { $in: postIds } }).lean();
    return posts.map(p => p.postName).join(',');
  }

  // ==================== 角色分配用户查询 ====================

  @DataScope({ deptAlias: "d", userAlias: "u" })
  async selectAllocatedList(params) {
    return await this._selectUserByRoleFilter(params, true);
  }

  @DataScope({ deptAlias: "d", userAlias: "u" })
  async selectUnallocatedList(params) {
    return await this._selectUserByRoleFilter(params, false);
  }

  async _selectUserByRoleFilter(params, allocated) {
    const filter = { delFlag: '0' };

    if (params.userName) {
      filter.userName = { $regex: params.userName, $options: 'i' };
    }
    if (params.phonenumber) {
      filter.phonenumber = { $regex: params.phonenumber, $options: 'i' };
    }

    // 查询已分配/未分配改角色的用户
    const roleId = this._toObjectId(params.roleId);
    const existingUR = await this.model.SysUserRole.find({ roleId }).select('userId').lean();
    const existingUserIds = existingUR.map(ur => ur.userId.toString());

    if (allocated) {
      filter._id = { $in: existingUserIds.map(id => this._toObjectId(id)) };
    } else {
      filter._id = { $nin: existingUserIds.map(id => this._toObjectId(id)) };
    }

    const result = await this.ctx.helper.pageQueryMongo(
      this.model.SysUser,
      filter,
      params,
      { populate: 'deptId', idField: 'userId' }
    );
    return result;
  }

  // ==================== 工具 ====================

  _toObjectId(id) {
    if (!id) return id;
    return typeof id === 'string'
      ? new this.app.mongoose.Types.ObjectId(id)
      : id;
  }
}

module.exports = UserService;
