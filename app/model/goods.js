/**
 * 商品
 * 对应 goods 表
 */
module.exports = app => {
  const mongoose = app.mongoose;

  // 规格值子模式
  const SpecValueSchema = new mongoose.Schema({
    specValueId: { type: String, default: null },
    specId: { type: String, default: null },
    saasId: { type: String, default: null },
    specValue: { type: String, default: null },  // 颜色|尺码
    image: { type: String, default: null },
  }, { _id: false });

  // 规格列表子模式
  const SpecListSchema = new mongoose.Schema({
    specId: { type: String, default: null },
    title: { type: String, default: null },  // 颜色|尺码
    specValueList: { type: [SpecValueSchema], default: [] },
  }, { _id: false });

  // SKU规格信息子模式
  const SpecInfoSchema = new mongoose.Schema({
    specId: { type: String, default: null },
    specTitle: { type: String, default: null },
    specValueId: { type: String, default: null },
    specValue: { type: String, default: null },
  }, { _id: false });

  // 价格信息子模式
  const PriceInfoSchema = new mongoose.Schema({
    priceType: { type: Number, default: null },
    price: { type: String, default: null },
    priceTypeName: { type: String, default: null },
  }, { _id: false });

  // 库存信息子模式
  const StockInfoSchema = new mongoose.Schema({
    stockQuantity: { type: Number, default: 0 },
    safeStockQuantity: { type: Number, default: 0 },
    soldQuantity: { type: Number, default: 0 },
  }, { _id: false });

  // 重量子模式
  const WeightSchema = new mongoose.Schema({
    value: { type: Number, default: null },
    unit: { type: String, default: 'KG' },
  }, { _id: false });

  // SKU列表子模式
  const SkuListSchema = new mongoose.Schema({
    skuId: { type: String, default: null },
    skuImage: { type: String, default: null },
    specInfo: { type: [SpecInfoSchema], default: [] },  // 规格组合 白色M码
    priceInfo: { type: [PriceInfoSchema], default: [] },  // 价格
    stockInfo: { type: StockInfoSchema, default: () => ({}) }, // 库存
    weight: { type: WeightSchema, default: () => ({}) }, // 重量
    volume: { type: mongoose.Schema.Types.Mixed, default: null },
    profitPrice: { type: Number, default: null },
  }, { _id: false });

  // SPU标签子模式
  const SpuTagSchema = new mongoose.Schema({
    id: { type: String, default: null },
    title: { type: String, default: null },
    image: { type: String, default: null },
  }, { _id: false });

  // 限购信息子模式
  const LimitInfoSchema = new mongoose.Schema({
    text: { type: String, default: null },
  }, { _id: false });

  const GoodsSchema = new mongoose.Schema({
    saasId: { type: String, default: '88888888', maxlength: 63, trim: true },
    storeId: { type: String, default: '1000', maxlength: 63, trim: true },
    spuId: { type: String, default: '0', maxlength: 63, trim: true },
    title: { type: String, default: null, maxlength: 255, trim: true },  // 商品名称
    primaryImage: { type: String, default: null, maxlength: 500, trim: true },  // 主图
    images: { type: [String], default: [] },  // 轮播图
    video: { type: String, default: null },  // 视频地址
    isPutOnSale: { type: Number, default: 1, enum: [0, 1] },  // 上架状态
    available: { type: Number, default: 1, enum: [0, 1, 2] },  // 商品状态
    minSalePrice: { type: Number, default: 0 }, // 最低售价（单位：分）
    minLinePrice: { type: Number, default: 0 }, // 最低划线价
    maxSalePrice: { type: Number, default: 0 }, // 最高售价
    maxLinePrice: { type: Number, default: 0 }, // 最高划线价
    spuStockQuantity: { type: Number, default: 0 },  // 总库存
    soldNum: { type: Number, default: 0 },  // 已售
    categoryIds: { type: [String], default: [] },  // 所属分类
    specList: { type: [SpecListSchema], default: [] }, // 规格定义
    skuList: { type: [SkuListSchema], default: [] },  //SKU明细
    spuTagList: { type: [SpuTagSchema], default: [] }, // 标签
    limitInfo: { type: [LimitInfoSchema], default: [] },  //限购规则
    desc: { type: [String], default: [] },
    etitle: { type: String, default: '' }, // 英文标题
    deleted: { type: Boolean, default: false },
  }, {
    timestamps: { createdAt: 'addTime', updatedAt: 'updateTime' },
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  });

  GoodsSchema.pre(/^find/, function (next) {
    this.find({ deleted: false });
    next();
  });

  return mongoose.model('Goods', GoodsSchema);
};
