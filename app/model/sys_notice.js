/**
 * 通知公告模型
 * 对应 MySQL sys_notice 表
 */
module.exports = app => {
  const mongoose = app.mongoose;
  const Schema = mongoose.Schema;

  const SysNoticeSchema = new Schema({
    noticeTitle: { type: String },
    noticeType: { type: String, default: '1' },
    noticeContent: { type: String },
    status: { type: String, default: '0' },
    createBy: { type: String },
    createTime: { type: Date, default: Date.now },
    updateBy: { type: String },
    updateTime: { type: Date, default: Date.now },
    remark: { type: String },
  }, {
    collection: 'sys_notice',
    timestamps: { createdAt: 'createTime', updatedAt: 'updateTime' },
  });

  return mongoose.model('SysNotice', SysNoticeSchema);
};
