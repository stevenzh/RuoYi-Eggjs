/**
 * 角色-部门关联模型（数据权限）
 * 对应 MySQL sys_role_dept 表
 */
module.exports = app => {
  const mongoose = app.mongoose;
  const Schema = mongoose.Schema;

  const SysRoleDeptSchema = new Schema({
    roleId: { type: Schema.Types.ObjectId, ref: 'SysRole', required: true },
    deptId: { type: Schema.Types.ObjectId, ref: 'SysDept', required: true },
  }, {
    collection: 'sys_role_dept',
  });

  SysRoleDeptSchema.index({ roleId: 1 });
  SysRoleDeptSchema.index({ deptId: 1 });
  SysRoleDeptSchema.index({ roleId: 1, deptId: 1 }, { unique: true });

  return mongoose.model('SysRoleDept', SysRoleDeptSchema);
};
