/**
 * 部门模型
 * 对应 MySQL sys_dept 表
 */
module.exports = app => {
  const mongoose = app.mongoose;
  const Schema = mongoose.Schema;

  const SysDeptSchema = new Schema({
    parentId: { type: Schema.Types.ObjectId, ref: 'SysDept', default: null },
    ancestors: { type: [String] },
    deptName: { type: String },
    orderNum: { type: Number, default: 0 },
    leader: { type: String },
    phone: { type: String },
    email: { type: String },
    status: { type: String, default: '0' },
    delFlag: { type: String, default: '0' },
    createBy: { type: String },
    createTime: { type: Date, default: Date.now },
    updateBy: { type: String },
    updateTime: { type: Date, default: Date.now },
  }, {
    collection: 'sys_dept',
    timestamps: { createdAt: 'createTime', updatedAt: 'updateTime' },
  });

  SysDeptSchema.index({ parentId: 1 });
  SysDeptSchema.index({ delFlag: 1, status: 1 });
  SysDeptSchema.index({ ancestors: 1 });

  return mongoose.model('SysDept', SysDeptSchema);
};
