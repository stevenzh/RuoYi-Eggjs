/*
 * @Description: 字典类型服务层（MongoDB/Mongoose 版本）
 * @Author: AI Assistant
 * @Date: 2025-10-24
 */

const Service = require('egg').Service;
const DictUtils = require('../../utils/dictUtils');

class DictTypeService extends Service {
  _toObjectId(id) {
    if (!id) return id;
    return typeof id === 'string'
      ? new this.app.mongoose.Types.ObjectId(id)
      : id;
  }

  _buildFilter(params) {
    const filter = {};
    if (params.dictName) {
      filter.dictName = { $regex: params.dictName, $options: 'i' };
    }
    if (params.status) filter.status = params.status;
    if (params.dictType) {
      filter.dictType = { $regex: params.dictType, $options: 'i' };
    }
    const beginTime = (params.params && params.params.beginTime) || params['params[beginTime]'];
    const endTime = (params.params && params.params.endTime) || params['params[endTime]'];
    if (beginTime) {
      filter.createTime = { ...filter.createTime, $gte: new Date(beginTime) };
    }
    if (endTime) {
      filter.createTime = { ...filter.createTime, $lte: new Date(endTime) };
    }
    return filter;
  }

  async selectDictTypePage(params = {}) {
    const filter = this._buildFilter(params);
    return await this.ctx.helper.pageQueryMongo(
      this.ctx.model.SysDictType, filter, params, { idField: 'dictId' }
    );
  }


  /**
   * 查询字典类型列表
   * @param {object} dictType - 查询参数
   * @return {array} 字典类型列表
   */
  async selectDictTypeList(dictType = {}) {
    const filter = this._buildFilter({
      ...dictType,
      params: { beginTime: dictType.beginTime, endTime: dictType.endTime },
    });
    const list = await this.ctx.model.SysDictType.find(filter).lean();
    return this.ctx.helper.normalizeIds(list, 'dictId');
  }

  /**
   * 查询所有字典类型
   * @return {array} 字典类型列表
   */
  async selectDictTypeAll() {
    const list = await this.ctx.model.SysDictType.find().lean();
    return this.ctx.helper.normalizeIds(list, 'dictId');
  }

  /**
   * 根据字典ID查询字典类型
   * @param {number} dictId - 字典ID
   * @return {object} 字典类型信息
   */
  async selectDictTypeById(dictId) {
    const doc = await this.ctx.model.SysDictType.findById(this._toObjectId(dictId)).lean();
    if (doc && doc._id != null) doc.dictId = doc._id;
    return doc;
  }

  /**
   * 根据字典类型查询字典类型
   * @param {string} dictType - 字典类型
   * @return {object} 字典类型信息
   */
  async selectDictTypeByType(dictType) {
    const doc = await this.ctx.model.SysDictType.findOne({ dictType }).lean();
    if (doc && doc._id != null) doc.dictId = doc._id;
    return doc;
  }

  /**
   * 校验字典类型是否唯一
   * @param {object} dictType - 字典类型对象
   * @return {boolean} true-唯一 false-不唯一
   */
  async checkDictTypeUnique(dictType) {
    const existing = await this.ctx.model.SysDictType.findOne({ dictType: dictType.dictType }).lean();
    if (!existing) return true;
    const dictId = dictType.dictId || dictType._id;
    return !dictId || existing._id.toString() === dictId.toString();
  }


  /**
   * 新增字典类型
   * @param {object} dictType - 字典类型对象
   * @return {number} 影响行数
   */
  async insertDictType(dictType) {
    const { ctx, app } = this;
    
    // 设置创建信息
    dictType.createBy = ctx.state.user.userName;

    const doc = { createTime: new Date() };
    if (dictType.dictName) doc.dictName = dictType.dictName;
    if (dictType.dictType) doc.dictType = dictType.dictType;
    if (dictType.status != null) doc.status = dictType.status;
    if (dictType.remark) doc.remark = dictType.remark;
    if (dictType.createBy) doc.createBy = dictType.createBy;

    await this.ctx.model.SysDictType.create(doc);
    await DictUtils.setDictCache(app, dictType.dictType, []);
    return 1;
  }


  /**
   * 修改字典类型
   * @param {object} dictType - 字典类型对象
   * @return {number} 影响行数
   */
  async updateDictType(dictType) {
    const { ctx, app } = this;
    
    // 查询旧的字典类型
    const oldDict = await this.selectDictTypeById(dictType.dictId);
    
    // 设置更新信息
    dictType.updateBy = ctx.state.user.userName;

    const setFields = { updateTime: new Date() };
    if (dictType.dictName) setFields.dictName = dictType.dictName;
    if (dictType.dictType) setFields.dictType = dictType.dictType;
    if (dictType.status != null) setFields.status = dictType.status;
    if (dictType.remark !== undefined) setFields.remark = dictType.remark;
    if (dictType.updateBy) setFields.updateBy = dictType.updateBy;

    const result = await this.ctx.model.SysDictType.updateOne(
      { _id: this._toObjectId(dictType.dictId) },
      { $set: setFields }
    );

    // 字典类型改变时更新数据表
    if (oldDict && oldDict.dictType !== dictType.dictType) {
      await this.ctx.model.SysDictData.updateMany(
        { dictType: oldDict.dictType },
        { $set: { dictType: dictType.dictType } }
      );
    }

    if (result.matchedCount > 0) {
      const dictDatas = await this.ctx.model.SysDictData
        .find({ status: '0', dictType: dictType.dictType })
        .sort({ dictSort: 1 })
        .lean();
      await DictUtils.setDictCache(app, dictType.dictType, dictDatas);
      return 1;
    }
    return 0;
  }

  /**
   * 删除字典类型
   * @param {array} dictIds - 字典ID数组
   * @return {number} 影响行数
   */
  async deleteDictTypeByIds(dictIds) {
    const { app } = this;
    let deletedCount = 0;
    
    for (const dictId of dictIds) {
      // 查询字典类型
      const dictType = await this.selectDictTypeById(dictId);
      if (!dictType) continue;

      
      // 检查是否有字典数据
      const count = await this.ctx.model.SysDictData.countDocuments({ dictType: dictType.dictType });
      if (count > 0) {
        throw new Error(`${dictType.dictName}已分配,不能删除`);
      }
      
      // 删除字典类型
      await this.ctx.model.SysDictType.deleteOne({ _id: this._toObjectId(dictId) });
      
      // 删除对应缓存
      await DictUtils.removeDictCache(app, dictType.dictType);
      deletedCount++;
    }
    
    return deletedCount;
  }

  /**
   * 加载字典缓存
   */
  async loadingDictCache() {
    const { ctx, app } = this;
    await DictUtils.loadingDictCache(app, ctx);
  }

  /**
   * 清空字典缓存
   */
  async clearDictCache() {
    const { app } = this;
    await DictUtils.clearDictCache(app);
  }

  /**
   * 重置字典缓存
   */
  async resetDictCache() {
    const { ctx, app } = this;
    await DictUtils.resetDictCache(app, ctx);
  }
}

module.exports = DictTypeService;


