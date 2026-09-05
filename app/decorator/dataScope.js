/*
 * @Description: 数据权限过滤装饰器（MongoDB/Mongoose 版本）
 * @Author: AI Assistant
 * @Date: 2025-11-23
 */

const { DataScopeType } = require('../constant');

/**
 * 数据权限装饰器
 * @param {object} options - 配置选项
 * @param {string} options.deptAlias - 部门表的别名，默认为 'd'
 * @param {string} options.userAlias - 用户表的别名，默认为 'u'
 * @param {string} options.permission - 权限字符（用于多个角色匹配符合要求的权限）
 * 
 * 使用示例：
 * @DataScope({ deptAlias: 'd', userAlias: 'u' })
 * async selectUserList(params) { ... }
 */
function DataScope(options = {}) {
  const { deptAlias = 'd', userAlias = 'u', permission = '' } = options;

  return function(target, propertyKey, descriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function(...args) {
      const ctx = this.ctx;
      const params = args[0] || {};

      // 清空 mongoScope 防止注入
      if (params.params) {
        params.params.mongoScope = null;
      } else {
        params.params = { mongoScope: null };
      }

      // 获取当前登录用户
      const user = ctx.state.user;

      // 如果未登录或是超级管理员，不过滤数据
      if (!user || ctx.helper.isAdmin(user)) {
        return await originalMethod.apply(this, args);
      }

      // 生成数据权限 MongoDB 条件
      const mongoScope = await generateDataScopeMongo(ctx, user, deptAlias, userAlias, permission);

      if (mongoScope) {
        params.params.mongoScope = mongoScope;
      }

      return await originalMethod.apply(this, args);
    };

    return descriptor;
  };
}

/**
 * 生成数据权限 SQL
 * @param {object} ctx - 上下文对象
 * @param {object} user - 当前用户
 * @param {string} deptAlias - 部门表别名
 * @param {string} userAlias - 用户表别名
 * @param {string} permission - 权限字符
 * @return {string} 数据权限 SQL 条件
 */
async function generateDataScopeMongo(ctx, user, deptAlias, userAlias, permission) {
  const { model } = ctx;

  // 查询用户拥有的角色
  const userRoles = await model.SysUserRole.find({
    userId: user._id || user.userId,
  }).lean();

  if (!userRoles || userRoles.length === 0) {
    // 没有角色，不查询任何数据
    return { deptId: null };
  }

  const roleIds = userRoles.map(ur => ur.roleId);
  const roles = await model.SysRole.find({
    _id: { $in: roleIds },
    delFlag: '0',
  }).lean();

  if (!roles || roles.length === 0) {
    return { deptId: null };
  }

  const conditions = [];
  const seenScopes = new Set();
  const scopeCustomIds = roles
    .filter(r => r.dataScope === DataScopeType.CUSTOM && r.status === '0')
    .map(r => r._id);

  for (const role of roles) {
    const dataScope = role.dataScope;

    if (seenScopes.has(dataScope) || role.status === '1') continue;

    switch (dataScope) {
      case DataScopeType.ALL:
        // 全部数据权限，不需要过滤
        return null;

      case DataScopeType.CUSTOM: {
        const deptIds = await getCustomDeptIds(model, scopeCustomIds);
        if (deptIds.length > 0) {
          // 注入到 params 上供服务层合并（deptId 字段名取决于具体场景）
          // 这里注入到 params._scopeDeptIds 供服务层使用
          params._scopeDeptIds = deptIds;
          conditions.push({ deptId: { $in: deptIds } });
        }
        break;
      }

      case DataScopeType.DEPT:
        if (user.deptId) {
          conditions.push({ deptId: user.deptId });
        }
        break;

      case DataScopeType.DEPT_AND_CHILD: {
        if (user.deptId) {
          // 查询自己及所有子部门
          const childDepts = await model.SysDept.find({
            ancestors:  { $elemMatch: { $eq: user.deptId } },
            delFlag: '0',
          }).select('_id').lean();
          const allDeptIds = [user.deptId, ...childDepts.map(d => d._id)];
          conditions.push({ deptId: { $in: allDeptIds } });
        }
        break;
      }

      case DataScopeType.SELF:
        if (userAlias) {
          conditions.push({ _id: user._id || user.userId });
        } else {
          conditions.push({ deptId: null });
        }
        break;
    }

    seenScopes.add(dataScope);
  }

  if (conditions.length === 0) {
    return { deptId: null };
  }

  return { $or: conditions };
}

/**
 * 获取自定义数据权限的部门ID列表
 */
async function getCustomDeptIds(model, roleIds) {
  if (!roleIds || roleIds.length === 0) return [];

  const roleDepts = await model.SysRoleDept.find({
    roleId: { $in: roleIds },
  }).select('deptId').lean();

  return roleDepts.map(rd => rd.deptId);
}

module.exports = {
  DataScope,
  DataScopeType,
  generateDataScopeSql: generateDataScopeMongo, // 兼容旧的导出名
};
