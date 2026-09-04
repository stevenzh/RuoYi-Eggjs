// This file is created by egg-ts-helper@1.35.2
// Do not modify this file!!!!!!!!!
/* eslint-disable */

import 'egg';
import ExportActivity = require('../../../app/model/activity');
import ExportActivityAward = require('../../../app/model/activityAward');
import ExportActivityWin = require('../../../app/model/activityWin');
import ExportAddress = require('../../../app/model/address');
import ExportArticle = require('../../../app/model/article');
import ExportArticleFavorite = require('../../../app/model/articleFavorite');
import ExportCategory = require('../../../app/model/category');
import ExportCoupon = require('../../../app/model/coupon');
import ExportCouponRecord = require('../../../app/model/couponRecord');
import ExportGenTable = require('../../../app/model/gen_table');
import ExportGenTableColumn = require('../../../app/model/gen_table_column');
import ExportGoods = require('../../../app/model/goods');
import ExportGoodsTag = require('../../../app/model/goodsTag');
import ExportIssueKnowledge = require('../../../app/model/issueKnowledge');
import ExportOrder = require('../../../app/model/order');
import ExportOrderItem = require('../../../app/model/orderItem');
import ExportPromotion = require('../../../app/model/promotion');
import ExportSearchHistory = require('../../../app/model/searchHistory');
import ExportSysConfig = require('../../../app/model/sys_config');
import ExportSysDept = require('../../../app/model/sys_dept');
import ExportSysDictData = require('../../../app/model/sys_dict_data');
import ExportSysDictType = require('../../../app/model/sys_dict_type');
import ExportSysJob = require('../../../app/model/sys_job');
import ExportSysJobLog = require('../../../app/model/sys_job_log');
import ExportSysLogininfor = require('../../../app/model/sys_logininfor');
import ExportSysMenu = require('../../../app/model/sys_menu');
import ExportSysNotice = require('../../../app/model/sys_notice');
import ExportSysOperLog = require('../../../app/model/sys_oper_log');
import ExportSysPost = require('../../../app/model/sys_post');
import ExportSysRole = require('../../../app/model/sys_role');
import ExportSysRoleDept = require('../../../app/model/sys_role_dept');
import ExportSysRoleMenu = require('../../../app/model/sys_role_menu');
import ExportSysUser = require('../../../app/model/sys_user');
import ExportSysUserPost = require('../../../app/model/sys_user_post');
import ExportSysUserRole = require('../../../app/model/sys_user_role');
import ExportUser = require('../../../app/model/user');

declare module 'egg' {
  interface IModel {
    Activity: ReturnType<typeof ExportActivity>;
    ActivityAward: ReturnType<typeof ExportActivityAward>;
    ActivityWin: ReturnType<typeof ExportActivityWin>;
    Address: ReturnType<typeof ExportAddress>;
    Article: ReturnType<typeof ExportArticle>;
    ArticleFavorite: ReturnType<typeof ExportArticleFavorite>;
    Category: ReturnType<typeof ExportCategory>;
    Coupon: ReturnType<typeof ExportCoupon>;
    CouponRecord: ReturnType<typeof ExportCouponRecord>;
    GenTable: ReturnType<typeof ExportGenTable>;
    GenTableColumn: ReturnType<typeof ExportGenTableColumn>;
    Goods: ReturnType<typeof ExportGoods>;
    GoodsTag: ReturnType<typeof ExportGoodsTag>;
    IssueKnowledge: ReturnType<typeof ExportIssueKnowledge>;
    Order: ReturnType<typeof ExportOrder>;
    OrderItem: ReturnType<typeof ExportOrderItem>;
    Promotion: ReturnType<typeof ExportPromotion>;
    SearchHistory: ReturnType<typeof ExportSearchHistory>;
    SysConfig: ReturnType<typeof ExportSysConfig>;
    SysDept: ReturnType<typeof ExportSysDept>;
    SysDictData: ReturnType<typeof ExportSysDictData>;
    SysDictType: ReturnType<typeof ExportSysDictType>;
    SysJob: ReturnType<typeof ExportSysJob>;
    SysJobLog: ReturnType<typeof ExportSysJobLog>;
    SysLogininfor: ReturnType<typeof ExportSysLogininfor>;
    SysMenu: ReturnType<typeof ExportSysMenu>;
    SysNotice: ReturnType<typeof ExportSysNotice>;
    SysOperLog: ReturnType<typeof ExportSysOperLog>;
    SysPost: ReturnType<typeof ExportSysPost>;
    SysRole: ReturnType<typeof ExportSysRole>;
    SysRoleDept: ReturnType<typeof ExportSysRoleDept>;
    SysRoleMenu: ReturnType<typeof ExportSysRoleMenu>;
    SysUser: ReturnType<typeof ExportSysUser>;
    SysUserPost: ReturnType<typeof ExportSysUserPost>;
    SysUserRole: ReturnType<typeof ExportSysUserRole>;
    User: ReturnType<typeof ExportUser>;
  }
}
