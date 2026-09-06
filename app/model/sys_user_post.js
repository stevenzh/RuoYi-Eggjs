/**
 * 用户-岗位关联模型
 */
module.exports = app => {
  const mongoose = app.mongoose;
  const Schema = mongoose.Schema;

  const SysUserPostSchema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'SysUser', required: true },
    postId: { type: Schema.Types.ObjectId, ref: 'SysPost', required: true },
  }, {
    collection: 'sys_user_post',
  });

  SysUserPostSchema.index({ userId: 1 });
  SysUserPostSchema.index({ postId: 1 });
  SysUserPostSchema.index({ userId: 1, postId: 1 }, { unique: true });

  return mongoose.model('SysUserPost', SysUserPostSchema);
};
