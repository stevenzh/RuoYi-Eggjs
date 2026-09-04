/**
 * 代码生成-表信息模型
 * 对应 MySQL gen_table 表
 */
module.exports = app => {
  const mongoose = app.mongoose;
  const Schema = mongoose.Schema;

  const GenTableSchema = new Schema({
    tableName: { type: String },
    tableComment: { type: String },
    subTableName: { type: String },
    subTableFkName: { type: String },
    className: { type: String },
    tplCategory: { type: String, default: 'crud' },
    tplWebType: { type: String, default: '' },
    packageName: { type: String },
    moduleName: { type: String },
    businessName: { type: String },
    functionName: { type: String },
    functionAuthor: { type: String },
    genType: { type: String, default: '0' },
    genPath: { type: String, default: '/' },
    options: { type: String },
    createBy: { type: String },
    createTime: { type: Date, default: Date.now },
    updateBy: { type: String },
    updateTime: { type: Date, default: Date.now },
    remark: { type: String },
  }, {
    collection: 'gen_table',
    timestamps: { createdAt: 'createTime', updatedAt: 'updateTime' },
  });

  GenTableSchema.index({ tableName: 1 });

  return mongoose.model('GenTable', GenTableSchema);
};
