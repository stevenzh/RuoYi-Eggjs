/**
 * 用户模型
 * 对应 MySQL sys_user 表
 */
module.exports = app => {
  const mongoose = app.mongoose;
  const Schema = mongoose.Schema;

  const SysUserSchema = new Schema({
    deptId: { type: Schema.Types.ObjectId, ref: 'SysDept', default: null },
    userName: { type: String, unique: true, required: true },
    nickName: { type: String },
    userType: { type: String, default: '00' },
    email: { type: String },
    phonenumber: { type: String },
    sex: { type: String, default: '0' },
    avatar: { type: String },
    password: { type: String },
    status: { type: String, default: '0' },
    delFlag: { type: String, default: '0' },
    loginIp: { type: String },
    loginDate: { type: Date },
    pwdUpdateDate: { type: Date },
    createBy: { type: String },
    createTime: { type: Date, default: Date.now },
    updateBy: { type: String },
    updateTime: { type: Date, default: Date.now },
    remark: { type: String },
  }, {
    collection: 'sys_user',
    timestamps: { createdAt: 'createTime', updatedAt: 'updateTime' },
  });

  SysUserSchema.index({ userName: 1 }, { unique: true });
  SysUserSchema.index({ deptId: 1 });
  SysUserSchema.index({ delFlag: 1, status: 1 });
  SysUserSchema.index({ phonenumber: 1 });
  SysUserSchema.index({ email: 1 });

  return mongoose.model('SysUser', SysUserSchema);
};
