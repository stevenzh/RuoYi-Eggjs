/*
 * @Description: 字典数据服务层（MongoDB/Mongoose 版本）
 * @Author: AI Assistant
 * @Date: 2025-10-24
 */

const Service = require('egg').Service;
const DictUtils = require('../../utils/dictUtils');

class DictDataService extends Service {
  _toObjectId(id) {
    if (!id) return id;
    return typeof id === 'string'
      ? new this.app.mongoose.Types.ObjectId(id)
      : id;
  }

  _buildFilter(params) {
    const filter = {};
    if (params.dictType) filter.dictType = params.dictType;
    if (params.dictLabel) {
      filter.dictLabel = { $regex: params.dictLabel, $options: 'i' };
    }
    if (params.status) filter.status = params.status;
    return filter;
  }

  // ==================== 分页查询 ====================

  async selectDictDataPage(params = {}) {
    const filter = this._buildFilter(params);
    return await this.ctx.helper.pageQueryMongo(
      this.ctx.model.SysDictData, filter, params,
      { sort: { dictSort: 1 }, idField: 'dictCode' }
    );
  }

  // ==================== 查询列表 ====================

  async selectDictDataList(dictData = {}) {
    const filter = this._buildFilter(dictData);
    const list = await this.ctx.model.SysDictData.find(filter).sort({ dictSort: 1 }).lean();
    return this.ctx.helper.normalizeIds(list, 'dictCode');
  }

  // ==================== 按 ID 查询 ====================

  async selectDictDataById(dictCode) {
    const doc = await this.ctx.model.SysDictData.findById(this._toObjectId(dictCode)).lean();
    if (doc && doc._id != null) doc.dictCode = doc._id;
    return doc;
  }

  // ==================== 按类型查询 ====================

  async selectDictDataByType(dictType) {
    const { app } = this;
    let dictDatas = await DictUtils.getDictCache(app, dictType);

    if (dictDatas && dictDatas.length > 0) {
      return this.ctx.helper.normalizeIds(dictDatas, 'dictCode');
    }

    const list = await this.ctx.model.SysDictData
      .find({ status: '0', dictType })
      .sort({ dictSort: 1 })
      .lean();

    dictDatas = this.ctx.helper.normalizeIds(list, 'dictCode');

    if (dictDatas && dictDatas.length > 0) {
      await DictUtils.setDictCache(app, dictType, dictDatas);
      return dictDatas;
    }

    return [];
  }

  // ==================== 新增 ====================

  async insertDictData(dictData) {
    const { ctx, app } = this;
    dictData.createBy = ctx.state.user.userName;

    const doc = { createTime: new Date() };
    if (dictData.dictSort != null) doc.dictSort = dictData.dictSort;
    if (dictData.dictLabel) doc.dictLabel = dictData.dictLabel;
    if (dictData.dictValue) doc.dictValue = dictData.dictValue;
    if (dictData.dictType) doc.dictType = dictData.dictType;
    if (dictData.cssClass) doc.cssClass = dictData.cssClass;
    if (dictData.listClass) doc.listClass = dictData.listClass;
    if (dictData.isDefault) doc.isDefault = dictData.isDefault;
    if (dictData.status != null) doc.status = dictData.status;
    if (dictData.remark) doc.remark = dictData.remark;
    if (dictData.createBy) doc.createBy = dictData.createBy;

    await this.ctx.model.SysDictData.create(doc);

    const dictDatas = await this.selectDictDataByType(dictData.dictType);
    await DictUtils.setDictCache(app, dictData.dictType, dictDatas);
    return 1;
  }

  // ==================== 修改 ====================

  async updateDictData(dictData) {
    const { ctx, app } = this;
    dictData.updateBy = ctx.state.user.userName;

    const setFields = { updateTime: new Date() };
    if (dictData.dictSort != null) setFields.dictSort = dictData.dictSort;
    if (dictData.dictLabel) setFields.dictLabel = dictData.dictLabel;
    if (dictData.dictValue) setFields.dictValue = dictData.dictValue;
    if (dictData.dictType) setFields.dictType = dictData.dictType;
    if (dictData.cssClass !== undefined) setFields.cssClass = dictData.cssClass;
    if (dictData.listClass !== undefined) setFields.listClass = dictData.listClass;
    if (dictData.isDefault) setFields.isDefault = dictData.isDefault;
    if (dictData.status != null) setFields.status = dictData.status;
    if (dictData.remark !== undefined) setFields.remark = dictData.remark;
    if (dictData.updateBy) setFields.updateBy = dictData.updateBy;

    const result = await this.ctx.model.SysDictData.updateOne(
      { _id: this._toObjectId(dictData.dictCode) },
      { $set: setFields }
    );

    if (result.matchedCount > 0) {
      const dictDatas = await this.selectDictDataByType(dictData.dictType);
      await DictUtils.setDictCache(app, dictData.dictType, dictDatas);
      return 1;
    }
    return 0;
  }

  // ==================== 修改字典类型 ====================

  async updateDictDataType(oldDictType, newDictType) {
    const result = await this.ctx.model.SysDictData.updateMany(
      { dictType: oldDictType },
      { $set: { dictType: newDictType } }
    );
    return result.modifiedCount;
  }

  // ==================== 统计 ====================

  async countDictDataByType(dictType) {
    const count = await this.ctx.model.SysDictData.countDocuments({ dictType });
    return { count };
  }

  // ==================== 删除 ====================

  async deleteDictDataByIds(dictCodes) {
    const { app } = this;
    let deletedCount = 0;
    const dictTypes = new Set();

    for (const dictCode of dictCodes) {
      const dictData = await this.selectDictDataById(dictCode);
      if (!dictData) continue;

      await this.ctx.model.SysDictData.deleteOne({ _id: this._toObjectId(dictCode) });
      dictTypes.add(dictData.dictType);
      deletedCount++;
    }

    for (const dictType of dictTypes) {
      const dictDatas = await this.selectDictDataByType(dictType);
      await DictUtils.setDictCache(app, dictType, dictDatas);
    }

    return deletedCount;
  }
}

module.exports = DictDataService;
