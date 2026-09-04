/**
 * 用户-角色关联模型
 * 对应 MySQL sys_user_role 表
 */
module.exports = app => {
  const mongoose = app.mongoose;
  const Schema = mongoose.Schema;

  const SysUserRoleSchema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'SysUser', required: true },
    roleId: { type: Schema.Types.ObjectId, ref: 'SysRole', required: true },
  }, {
    collection: 'sys_user_role',
  });

  SysUserRoleSchema.index({ userId: 1 });
  SysUserRoleSchema.index({ roleId: 1 });
  SysUserRoleSchema.index({ userId: 1, roleId: 1 }, { unique: true });

  return mongoose.model('SysUserRole', SysUserRoleSchema);
};
