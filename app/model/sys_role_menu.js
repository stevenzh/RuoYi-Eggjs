/**
 * 角色-菜单关联模型
 * 对应 MySQL sys_role_menu 表
 */
module.exports = app => {
  const mongoose = app.mongoose;
  const Schema = mongoose.Schema;

  const SysRoleMenuSchema = new Schema({
    roleId: { type: Schema.Types.ObjectId, ref: 'SysRole', required: true },
    menuId: { type: Schema.Types.ObjectId, ref: 'SysMenu', required: true },
  }, {
    collection: 'sys_role_menu',
  });

  SysRoleMenuSchema.index({ roleId: 1 });
  SysRoleMenuSchema.index({ menuId: 1 });
  SysRoleMenuSchema.index({ roleId: 1, menuId: 1 }, { unique: true });

  return mongoose.model('SysRoleMenu', SysRoleMenuSchema);
};
