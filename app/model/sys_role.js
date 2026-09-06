/**
 * 角色模型
 */
module.exports = app => {
  const mongoose = app.mongoose;
  const Schema = mongoose.Schema;

  const SysRoleSchema = new Schema({
    roleName: { type: String },
    roleKey: { type: String },
    roleSort: { type: Number, default: 0 },
    dataScope: { type: String, default: '1' },
    menuCheckStrictly: { type: Boolean, default: false },
    deptCheckStrictly: { type: Boolean, default: false },
    status: { type: String, default: '0' },
    delFlag: { type: String, default: '0' },
    createBy: { type: String },
    createTime: { type: Date, default: Date.now },
    updateBy: { type: String },
    updateTime: { type: Date, default: Date.now },
    remark: { type: String },
  }, {
    collection: 'sys_role',
    timestamps: { createdAt: 'createTime', updatedAt: 'updateTime' },
  });

  SysRoleSchema.index({ roleKey: 1 });
  SysRoleSchema.index({ delFlag: 1, status: 1 });

  return mongoose.model('SysRole', SysRoleSchema);
};
