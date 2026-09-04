/**
 * 知识库
 * 对应 issueknowledges 表 (MongoDB 自动转为小写复数 issueknowledges)
 */
module.exports = app => {
  const mongoose = app.mongoose;

  const IssueKnowledgeSchema = new mongoose.Schema({
    question: { type: String, required: true, trim: true },  // 问题
    solution: { type: String, default: null }, // 解答
    category: { type: String, required: true, maxlength: 50, trim: true }, // 分类
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  }, {
    timestamps: { createdAt: 'addTime', updatedAt: 'updateTime' },
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  });

  return mongoose.model('IssueKnowledge', IssueKnowledgeSchema);
};
