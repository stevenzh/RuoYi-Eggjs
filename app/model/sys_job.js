/**
 * 定时任务模型
 */
module.exports = app => {
  const mongoose = app.mongoose;
  const Schema = mongoose.Schema;

  const SysJobSchema = new Schema({
    jobName: { type: String },
    jobGroup: { type: String, default: 'DEFAULT' },
    invokeTarget: { type: String },
    cronExpression: { type: String },
    misfirePolicy: { type: String, default: '3' },
    concurrent: { type: String, default: '1' },
    status: { type: String, default: '0' },
    createBy: { type: String },
    createTime: { type: Date, default: Date.now },
    updateBy: { type: String },
    updateTime: { type: Date, default: Date.now },
    remark: { type: String },
  }, {
    collection: 'sys_job',
    timestamps: { createdAt: 'createTime', updatedAt: 'updateTime' },
  });

  SysJobSchema.index({ jobName: 1, jobGroup: 1 });
  SysJobSchema.index({ status: 1 });

  return mongoose.model('SysJob', SysJobSchema);
};
