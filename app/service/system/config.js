/*
 * @Description: 参数配置服务层
 * @Author: AI Assistant
 * @Date: 2025-10-23
 */

const Service = require('egg').Service;
const { CacheConstants } = require('../../constant');

class ConfigService extends Service {
  _toObjectId(id) {
    if (!id) return id;
    return typeof id === 'string'
      ? new this.app.mongoose.Types.ObjectId(id)
      : id;
  }

  _buildFilter(params) {
    const filter = {};
    if (params.configName) {
      filter.configName = { $regex: params.configName, $options: 'i' };
    }
    if (params.configType) {
      filter.configType = params.configType;
    }
    if (params.configKey) {
      filter.configKey = { $regex: params.configKey, $options: 'i' };
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

  async selectConfigPage(params = {}) {
    const filter = this._buildFilter(params);
    return await this.ctx.helper.pageQueryMongo(
      this.ctx.model.SysConfig, filter, params, { idField: 'configId' }
    );
  }


  /**
   * 查询参数配置列表
   * @param {object} config - 查询参数
   * @return {array} 参数配置列表
   */
  async selectConfigList(config = {}) {
    const filter = this._buildFilter({
      ...config,
      params: { beginTime: config.beginTime, endTime: config.endTime },
    });
    const list = await this.ctx.model.SysConfig.find(filter).lean();
    return this.ctx.helper.normalizeIds(list, 'configId');
  }

  /**
   * 根据参数ID查询参数配置
   * @param {number} configId - 参数ID
   * @return {object} 参数配置信息
   */
  async selectConfigById(configId) {
    const doc = await this.ctx.model.SysConfig.findById(this._toObjectId(configId)).lean();
    if (doc && doc._id != null) doc.configId = doc._id;
    return doc;
  }

  /**
   * 根据键名查询参数配置值
   * @param {string} configKey - 参数键名
   * @return {string} 参数键值
   */
  async selectConfigByKey(configKey) {
    const { app } = this;
    
    // 先从缓存中获取
    const cacheKey = CacheConstants.SYS_CONFIG_KEY + configKey;
    let configValue = await app.cache.default.get(cacheKey);

    if (configValue) return configValue;

    const config = await this.ctx.model.SysConfig.findOne({ configKey }).lean();

    if (config) {
      await app.cache.default.set(cacheKey, config.configValue, 0);
      return config.configValue;
    }

    return '';
  }

  /**
   * 校验参数键名是否唯一
   * @param {object} config - 参数配置对象
   * @return {boolean} true-唯一 false-不唯一
   */
  async checkConfigKeyUnique(config) {
    const existing = await this.ctx.model.SysConfig.findOne({ configKey: config.configKey }).lean();
    if (!existing) return true;
    const configId = config.configId || config._id;
    return !configId || existing._id.toString() === configId.toString();
  }


  /**
   * 新增参数配置
   * @param {object} config - 参数配置对象
   * @return {number} 影响行数
   */
  async insertConfig(config) {
    const { ctx, app } = this;
    
    // 设置创建信息
    config.createBy = ctx.state.user.userName;

    const doc = { createTime: new Date() };
    if (config.configName) doc.configName = config.configName;
    if (config.configKey) doc.configKey = config.configKey;
    if (config.configValue) doc.configValue = config.configValue;
    if (config.configType) doc.configType = config.configType;
    if (config.createBy) doc.createBy = config.createBy;
    if (config.remark) doc.remark = config.remark;

    await this.ctx.model.SysConfig.create(doc);

    const cacheKey = CacheConstants.SYS_CONFIG_KEY + config.configKey;
    await app.cache.default.set(cacheKey, config.configValue, 0);
    return 1;
  }


  /**
   * 修改参数配置
   * @param {object} config - 参数配置对象
   * @return {number} 影响行数
   */
  async updateConfig(config) {
    const { ctx, app } = this;
    
    // 查询旧的参数配置
    const oldConfig = await this.selectConfigById(config.configId);
    
    // 设置更新信息
    config.updateBy = ctx.state.user.userName;

    const setFields = { updateTime: new Date() };
    if (config.configName) setFields.configName = config.configName;
    if (config.configKey) setFields.configKey = config.configKey;
    if (config.configValue) setFields.configValue = config.configValue;
    if (config.configType) setFields.configType = config.configType;
    if (config.updateBy) setFields.updateBy = config.updateBy;
    if (config.remark !== undefined) setFields.remark = config.remark;

    const result = await this.ctx.model.SysConfig.updateOne(
      { _id: this._toObjectId(config.configId) },
      { $set: setFields }
    );

    if (result.modifiedCount > 0 || result.matchedCount > 0) {
      if (oldConfig && oldConfig.configKey !== config.configKey) {
        await app.cache.default.del(CacheConstants.SYS_CONFIG_KEY + oldConfig.configKey);
      }
      await app.cache.default.set(
        CacheConstants.SYS_CONFIG_KEY + config.configKey, config.configValue, 0
      );
      return 1;
    }
    return 0;
  }

  /**
   * 删除参数配置
   * @param {array} configIds - 参数ID数组
   * @return {number} 影响行数
   */
  async deleteConfigByIds(configIds) {
    const { app } = this;
    let deletedCount = 0;

    for (const configId of configIds) {
      // 查询参数配置
      const config = await this.selectConfigById(configId);
      if (!config) continue;

      // 检查是否为内置参数
      if (config.configType === 'Y') {
        throw new Error(`内置参数【${config.configKey}】不能删除`);
      }
      
      // 删除参数配置
      await this.ctx.model.SysConfig.deleteOne({ _id: this._toObjectId(configId) });
      
      // 删除缓存
      await app.cache.default.del(CacheConstants.SYS_CONFIG_KEY + config.configKey);
      deletedCount++;
    }

    return deletedCount;
  }

  /**
   * 加载参数缓存
   */
  async loadingConfigCache() {
    const { ctx, app } = this;
    
    // 查询所有参数配置
    const configs = await this.selectConfigList({});
    
    // 存入缓存
    for (const config of configs) {
      await app.cache.default.set(
        CacheConstants.SYS_CONFIG_KEY + config.configKey, config.configValue, 0
      );
    }
    ctx.logger.info('参数配置缓存加载完成');
  }

  /**
   * 清空参数缓存
   */
  async clearConfigCache() {
    const { app } = this;
    
    // 获取所有缓存键
    const keys = await app.cache.default.keys(CacheConstants.SYS_CONFIG_KEY + '*');
    
    // 删除所有参数缓存
    for (const key of keys) {
      await app.cache.default.del(key);
    }
  }

  /**
   * 重置参数缓存
   */
  async resetConfigCache() {
    // 清空缓存
    await this.clearConfigCache();
    
    // 重新加载缓存
    await this.loadingConfigCache();
  }
}

module.exports = ConfigService;


