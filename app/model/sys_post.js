/**
 * 岗位模型
 */
module.exports = app => {
  const mongoose = app.mongoose;
  const Schema = mongoose.Schema;

  const SysPostSchema = new Schema({
    postCode: { type: String },
    postName: { type: String },
    postSort: { type: Number, default: 0 },
    status: { type: String, default: '0' },
    createBy: { type: String },
    createTime: { type: Date, default: Date.now },
    updateBy: { type: String },
    updateTime: { type: Date, default: Date.now },
    remark: { type: String },
  }, {
    collection: 'sys_post',
    timestamps: { createdAt: 'createTime', updatedAt: 'updateTime' },
  });

  SysPostSchema.index({ postCode: 1 });

  return mongoose.model('SysPost', SysPostSchema);
};
