/**
 * 代码生成-表字段信息模型
 */
module.exports = app => {
  const mongoose = app.mongoose;
  const Schema = mongoose.Schema;

  const GenTableColumnSchema = new Schema({
    tableId: { type: Schema.Types.ObjectId, ref: 'GenTable', required: true },
    columnName: { type: String },
    columnComment: { type: String },
    columnType: { type: String },
    javaType: { type: String },
    javaField: { type: String },
    isPk: { type: String, default: '0' },
    isIncrement: { type: String, default: '0' },
    isRequired: { type: String, default: '0' },
    isInsert: { type: String, default: '1' },
    isEdit: { type: String, default: '1' },
    isList: { type: String, default: '1' },
    isQuery: { type: String, default: '1' },
    queryType: { type: String, default: 'EQ' },
    htmlType: { type: String, default: 'input' },
    dictType: { type: String, default: '' },
    sort: { type: Number, default: 0 },
    createBy: { type: String },
    createTime: { type: Date, default: Date.now },
    updateBy: { type: String },
    updateTime: { type: Date, default: Date.now },
  }, {
    collection: 'gen_table_column',
    timestamps: { createdAt: 'createTime', updatedAt: 'updateTime' },
  });

  GenTableColumnSchema.index({ tableId: 1 });
  GenTableColumnSchema.index({ sort: 1 });

  return mongoose.model('GenTableColumn', GenTableColumnSchema);
};
