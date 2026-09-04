/*
 * @Description: 菜单服务层（MongoDB/Mongoose 版本）
 * @Author: AI Assistant
 * @Date: 2025-10-23
 */

const Service = require('egg').Service;

// 菜单常量
const TYPE_DIR = 'M'; // 目录
const TYPE_MENU = 'C'; // 菜单
const TYPE_BUTTON = 'F'; // 按钮
const YES_FRAME = 0; // 是外链
const NO_FRAME = 1; // 否外链
const LAYOUT = 'Layout';
const PARENT_VIEW = 'ParentView';
const INNER_LINK = 'InnerLink';

/** 基础查询字段（用于 lean 后的字段选择，保持与原 SQL 一致） */
const MENU_SELECT_FIELDS = 'menuName parentId orderNum path component query routeName isFrame isCache menuType visible status perms icon createTime';

class MenuService extends Service {
  /** 获取模型快捷访问 */
  get model() {
    return this.ctx.model;
  }

  /**
   * 将 ID 转换为 Mongoose ObjectId（兼容字符串和 ObjectId 实例）
   */
  _toObjectId(id) {
    if (!id) return id;
    return typeof id === 'string'
      ? new this.app.mongoose.Types.ObjectId(id)
      : id;
  }

  /**
   * 将查询结果中的 _id 映射为 menuId 字符串，方便树构建等使用
   */
  _normalizeMenu(doc) {
    if (!doc) return doc;
    const normalized = { ...doc };
    if (doc._id != null) {
      normalized.menuId = doc._id.toString();
    }
    if (doc.parentId != null && typeof doc.parentId === 'object') {
      normalized.parentId = doc.parentId.toString();
    }
    return normalized;
  }

  /**
   * 批量规范化菜单列表
   */
  _normalizeMenuList(list) {
    if (!list) return [];
    return list.map(doc => this._normalizeMenu(doc));
  }

  /**
   * 构建 selectMenuList 的 Mongoose 过滤条件
   */
  _buildMenuFilter(menu) {
    const filter = {};
    if (menu.menuName != null && menu.menuName !== '') {
      filter.menuName = { $regex: menu.menuName, $options: 'i' };
    }
    if (menu.visible != null && menu.visible !== '') {
      filter.visible = menu.visible;
    }
    if (menu.status != null && menu.status !== '') {
      filter.status = menu.status;
    }
    return filter;
  }

  // ==================== 查询菜单列表 ====================

  /**
   * 查询菜单列表
   * @param {object} menu - 查询参数
   * @param {number|string} userId - 用户ID（兼容旧接口，实际通过 ctx.state.user 判断管理员）
   * @return {array} 菜单列表
   */
  async selectMenuList(menu = {}, userId) {
    const { ctx } = this;
    const filter = this._buildMenuFilter(menu);
    let menus;

    // 管理员显示所有菜单信息
    if (ctx.helper.isAdmin(ctx.state.user)) {
      menus = await this.model.SysMenu
        .find(filter)
        .select(MENU_SELECT_FIELDS)
        .sort({ parentId: 1, orderNum: 1 })
        .lean();
    } else {
      // 普通用户显示有权限的菜单
      // 1. 获取用户的角色ID列表
      const userRoles = await this.model.SysUserRole
        .find({ userId: this._toObjectId(userId) })
        .select('roleId')
        .lean();
      const roleIds = userRoles.map(ur => ur.roleId);

      if (roleIds.length === 0) {
        return [];
      }

      // 2. 获取角色关联的菜单ID列表
      const roleMenus = await this.model.SysRoleMenu
        .find({ roleId: { $in: roleIds } })
        .select('menuId')
        .lean();
      const menuIds = roleMenus.map(rm => rm.menuId);

      if (menuIds.length === 0) {
        return [];
      }

      // 3. 查询菜单并去重
      const menuFilter = { _id: { $in: menuIds }, ...filter };
      menus = await this.model.SysMenu
        .find(menuFilter)
        .select(MENU_SELECT_FIELDS)
        .sort({ parentId: 1, orderNum: 1 })
        .lean();
    }

    // 去重（按 _id）并规范化
    const seen = new Set();
    const result = [];
    for (const m of (menus || [])) {
      const key = m._id.toString();
      if (!seen.has(key)) {
        seen.add(key);
        result.push(this._normalizeMenu(m));
      }
    }
    return result;
  }

  /**
   * 根据菜单ID查询菜单
   * @param {string} menuId - 菜单ID
   * @return {object} 菜单信息
   */
  async selectMenuById(menuId) {
    const menu = await this.model.SysMenu
      .findById(this._toObjectId(menuId))
      .select(MENU_SELECT_FIELDS)
      .lean();
    return this._normalizeMenu(menu);
  }

  /**
   * 根据用户ID查询权限标识
   * @param {number|string} userId - 用户ID
   * @return {array} 权限标识列表
   */
  async selectPermsByUserId(userId) {
    const { ctx } = this;

    // 管理员拥有所有权限
    if (ctx.helper.isAdmin(ctx.state.user)) {
      return ['*:*:*'];
    }

    // 1. 查询用户拥有的角色列表
    const userRoles = await this.model.SysUserRole
      .find({ userId: this._toObjectId(userId) })
      .select('roleId')
      .lean();
    const roleIds = userRoles.map(ur => ur.roleId);

    if (roleIds.length === 0) {
      return [];
    }

    // 2. 查询有效角色（未删除、状态正常、非admin角色）
    const roles = await this.model.SysRole
      .find({
        _id: { $in: roleIds },
        delFlag: '0',
        status: '0',
        roleKey: { $ne: 'admin' },
      })
      .select('_id')
      .lean();

    const perms = [];
    for (const role of roles) {
      const rolePerms = await this.selectMenuPermsByRoleId(role._id);
      perms.push(...rolePerms);
    }

    // 去重并返回
    return [...new Set(perms)];
  }

  /**
   * 根据用户ID查询菜单树
   * @param {number|string} userId - 用户ID
   * @return {array} 菜单树
   */
  async selectMenuTreeByUserId(userId) {
    const { ctx } = this;
    let menus;

    // 如果是管理员，查询所有菜单
    if (ctx.helper.isAdmin(ctx.state.user)) {
      menus = await this.model.SysMenu
        .find({ menuType: { $in: ['M', 'C'] }, status: '0' })
        .select(MENU_SELECT_FIELDS)
        .sort({ parentId: 1, orderNum: 1 })
        .lean();
    } else {
      // 1. 获取用户的角色ID列表
      const userRoles = await this.model.SysUserRole
        .find({ userId: this._toObjectId(userId) })
        .select('roleId')
        .lean();
      const roleIds = userRoles.map(ur => ur.roleId);

      if (roleIds.length === 0) {
        return [];
      }

      // 2. 过滤出状态正常的角色
      const activeRoles = await this.model.SysRole
        .find({ _id: { $in: roleIds }, status: '0' })
        .select('_id')
        .lean();
      const activeRoleIds = activeRoles.map(r => r._id);

      if (activeRoleIds.length === 0) {
        return [];
      }

      // 3. 获取角色关联的菜单ID列表
      const roleMenus = await this.model.SysRoleMenu
        .find({ roleId: { $in: activeRoleIds } })
        .select('menuId')
        .lean();
      const menuIds = roleMenus.map(rm => rm.menuId);

      if (menuIds.length === 0) {
        return [];
      }

      // 4. 查询目录和菜单类型且状态正常的菜单
      menus = await this.model.SysMenu
        .find({
          _id: { $in: menuIds },
          menuType: { $in: ['M', 'C'] },
          status: '0',
        })
        .select(MENU_SELECT_FIELDS)
        .sort({ parentId: 1, orderNum: 1 })
        .lean();
    }

    // 去重并规范化
    const seen = new Set();
    const normalizedMenus = [];
    for (const m of (menus || [])) {
      const key = m._id.toString();
      if (!seen.has(key)) {
        seen.add(key);
        normalizedMenus.push(this._normalizeMenu(m));
      }
    }

    // 使用 getChildPerms 构建菜单树（根节点 parentId 为 null）
    return this.getChildPerms(normalizedMenus, null);
  }

  /**
   * 构建前端路由菜单树
   * @param {array} menus - 菜单列表
   * @param {number|string|null} parentId - 父菜单ID（null 表示根节点）
   * @return {array} 菜单树
   */
  buildRouterMenuTree(menus, parentId) {
    const tree = [];

    menus.forEach((menu) => {
      const menuParentId = menu.parentId || null;
      if (String(menuParentId) === String(parentId)) {
        const children = this.buildRouterMenuTree(menus, menu.menuId);

        const menuNode = {
          name: menu.routeName || menu.menuName,
          path: menu.path,
          hidden: menu.visible === '1',
          component: menu.component,
          query: menu.query,
          meta: {
            title: menu.menuName,
            icon: menu.icon,
            noCache: menu.isCache === '1',
            link: menu.path,
          },
        };

        if (children.length > 0) {
          menuNode.children = children;
          menuNode.alwaysShow = true;
          menuNode.redirect = 'noRedirect';
        }

        tree.push(menuNode);
      }
    });

    return tree;
  }

  /**
   * 根据父节点ID获取所有子节点
   * @param {array} list - 菜单列表
   * @param {number|string|null} parentId - 父节点ID（null 表示根节点）
   * @return {array} 子节点列表
   */
  getChildPerms(list, parentId) {
    const returnList = [];

    for (const menu of list) {
      // 根据传入的某个父节点ID，遍历该父节点的所有子节点
      if (String(menu.parentId || null) === String(parentId)) {
        this.recursionFn(list, menu);
        returnList.push(menu);
      }
    }

    return returnList;
  }

  /**
   * 构建菜单树（用于管理界面）
   * @param {array} menus - 菜单列表
   * @return {array} 菜单树
   */
  buildMenuTree(menus) {
    // 找出所有菜单ID
    const menuIds = menus.map((m) => m.menuId);

    // 找出顶级节点（父节点不在列表中的）
    const tree = [];
    menus.forEach((menu) => {
      if (!menuIds.includes(menu.parentId)) {
        this.recursionFn(menus, menu);
        tree.push(menu);
      }
    });

    return tree.length > 0 ? tree : menus;
  }

  /**
   * 递归列表
   * @param {array} list - 菜单列表
   * @param {object} t - 当前菜单节点
   */
  recursionFn(list, t) {
    // 得到子节点列表
    const childList = this.getChildList(list, t);
    t.children = childList;

    for (const tChild of childList) {
      if (this.hasChild(list, tChild)) {
        this.recursionFn(list, tChild);
      }
    }
  }

  /**
   * 得到子节点列表
   * @param {array} list - 菜单列表
   * @param {object} t - 当前菜单节点
   * @return {array} 子节点列表
   */
  getChildList(list, t) {
    const tlist = [];

    for (const n of list) {
      if (String(n.parentId || null) === String(t.menuId)) {
        tlist.push(n);
      }
    }

    return tlist;
  }

  /**
   * 判断是否有子节点
   * @param {array} list - 菜单列表
   * @param {object} t - 当前菜单节点
   * @return {boolean} 是否有子节点
   */
  hasChild(list, t) {
    return this.getChildList(list, t).length > 0;
  }

  /**
   * 构建菜单树选择结构
   * @param {array} menus - 菜单列表
   * @return {array} 树选择结构
   */
  buildMenuTreeSelect(menus) {
    const menuTree = this.buildMenuTree(menus);
    return this.convertToTreeSelect(menuTree);
  }

  /**
   * 转换为树选择结构
   * @param {array} menus - 菜单树
   * @return {array} 树选择结构
   */
  convertToTreeSelect(menus) {
    const treeSelect = [];

    menus.forEach((menu) => {
      const node = {
        id: menu.menuId,
        label: menu.menuName,
      };

      if (menu.children && menu.children.length > 0) {
        node.children = this.convertToTreeSelect(menu.children);
      }

      treeSelect.push(node);
    });

    return treeSelect;
  }

  /**
   * 根据角色ID查询菜单ID列表
   * 使用两次查询实现 menuCheckStrictly 逻辑：
   *   1. 查询角色获取 menuCheckStrictly 标识
   *   2. 查询菜单列表，如果 menuCheckStrictly 为 true 则过滤掉为父节点的菜单
   * @param {string} roleId - 角色ID
   * @return {array} 菜单列表
   */
  async selectMenuListByRoleId(roleId) {
    const _roleId = this._toObjectId(roleId);

    // 查询1：获取角色的 menuCheckStrictly 标识
    const role = await this.model.SysRole.findById(_roleId).select('menuCheckStrictly').lean();
    const menuCheckStrictly = role && role.menuCheckStrictly;

    // 查询2：获取角色关联的所有菜单ID
    const roleMenus = await this.model.SysRoleMenu
      .find({ roleId: _roleId })
      .select('menuId')
      .lean();
    let menuIds = roleMenus.map(rm => rm.menuId);

    if (menuIds.length === 0) {
      return [];
    }

    // 如果 menuCheckStrictly 为 true，需要排除那些是其他已分配菜单的父节点的菜单
    if (menuCheckStrictly) {
      // 查询所有已分配菜单的文档，获取它们的 parentId
      const assignedMenus = await this.model.SysMenu
        .find({ _id: { $in: menuIds }, parentId: { $ne: null } })
        .select('parentId')
        .lean();

      // 收集所有为父节点的 menuId（即被其他已分配菜单引用的 parentId）
      const parentIdSet = new Set(
        assignedMenus
          .map(m => m.parentId ? m.parentId.toString() : null)
          .filter(id => id != null)
      );

      // 过滤掉父节点
      menuIds = menuIds.filter(id => !parentIdSet.has(id.toString()));
    }

    // 查询最终菜单列表并排序
    const menus = await this.model.SysMenu
      .find({ _id: { $in: menuIds } })
      .select(MENU_SELECT_FIELDS)
      .sort({ parentId: 1, orderNum: 1 })
      .lean();

    return this._normalizeMenuList(menus);
  }

  /**
   * 校验菜单名称是否唯一
   * @param {object} menu - 菜单对象
   * @return {boolean} true-唯一 false-不唯一
   */
  async checkMenuNameUnique(menu) {
    // parentId 为 0 或 '0' 表示根节点，Mongoose 中根节点 parentId 为 null
    const parentId = (menu.parentId == null || menu.parentId === 0 || menu.parentId === '0')
      ? null
      : this._toObjectId(menu.parentId);

    const existing = await this.model.SysMenu
      .findOne({
        menuName: menu.menuName,
        parentId,
      })
      .select('_id')
      .lean();

    if (existing && menu.menuId) {
      return existing._id.toString() === String(menu.menuId);
    }

    return !existing;
  }

  /**
   * 是否存在子菜单
   * @param {string} menuId - 菜单ID
   * @return {boolean} true-存在 false-不存在
   */
  async hasChildByMenuId(menuId) {
    const count = await this.model.SysMenu.countDocuments({
      parentId: this._toObjectId(menuId),
    });
    return count > 0;
  }

  /**
   * 检查菜单是否已分配给角色
   * @param {string} menuId - 菜单ID
   * @return {boolean} true-已分配 false-未分配
   */
  async checkMenuExistRole(menuId) {
    const count = await this.model.SysRoleMenu.countDocuments({
      menuId: this._toObjectId(menuId),
    });
    return count > 0;
  }

  /**
   * 新增菜单
   * @param {object} menu - 菜单对象
   * @return {object} 创建的菜单文档
   */
  async insertMenu(menu) {
    const { ctx } = this;

    // 动态构建要保存的字段（对应原 XML <if test="..."> 逻辑）
    const doc = {};

    if (menu.parentId != null && menu.parentId !== 0 && menu.parentId !== '0') {
      doc.parentId = this._toObjectId(menu.parentId);
    }
    if (menu.menuName != null && menu.menuName !== '') {
      doc.menuName = menu.menuName;
    }
    if (menu.orderNum != null) {
      doc.orderNum = menu.orderNum;
    }
    if (menu.path != null && menu.path !== '') {
      doc.path = menu.path;
    }
    if (menu.component != null && menu.component !== '') {
      doc.component = menu.component;
    }
    if (menu.query != null && menu.query !== '') {
      doc.query = menu.query;
    }
    if (menu.routeName != null) {
      doc.routeName = menu.routeName;
    }
    if (menu.isFrame != null && menu.isFrame !== '') {
      doc.isFrame = menu.isFrame;
    }
    if (menu.isCache != null && menu.isCache !== '') {
      doc.isCache = menu.isCache;
    }
    if (menu.menuType != null && menu.menuType !== '') {
      doc.menuType = menu.menuType;
    }
    if (menu.visible != null) {
      doc.visible = menu.visible;
    }
    if (menu.status != null) {
      doc.status = menu.status;
    }
    if (menu.perms != null && menu.perms !== '') {
      doc.perms = menu.perms;
    }
    if (menu.icon != null && menu.icon !== '') {
      doc.icon = menu.icon;
    }
    if (menu.remark != null && menu.remark !== '') {
      doc.remark = menu.remark;
    }

    // 设置创建信息
    doc.createBy = ctx.state.user.userName;

    const result = await this.model.SysMenu.create(doc);
    return result;
  }

  /**
   * 修改菜单
   * @param {object} menu - 菜单对象
   * @return {number} 影响的文档数
   */
  async updateMenu(menu) {
    const { ctx } = this;

    // 动态构建更新字段（对应原 XML <set> + <if test="..."> 逻辑）
    const setFields = {};

    if (menu.menuName != null && menu.menuName !== '') {
      setFields.menuName = menu.menuName;
    }
    if (menu.parentId != null) {
      setFields.parentId = menu.parentId === 0 || menu.parentId === '0'
        ? null
        : this._toObjectId(menu.parentId);
    }
    if (menu.orderNum != null) {
      setFields.orderNum = menu.orderNum;
    }
    if (menu.path != null && menu.path !== '') {
      setFields.path = menu.path;
    }
    if (menu.component != null) {
      setFields.component = menu.component;
    }
    if (menu.query != null) {
      setFields.query = menu.query;
    }
    if (menu.routeName != null) {
      setFields.routeName = menu.routeName;
    }
    if (menu.isFrame != null && menu.isFrame !== '') {
      setFields.isFrame = menu.isFrame;
    }
    if (menu.isCache != null && menu.isCache !== '') {
      setFields.isCache = menu.isCache;
    }
    if (menu.menuType != null && menu.menuType !== '') {
      setFields.menuType = menu.menuType;
    }
    if (menu.visible != null) {
      setFields.visible = menu.visible;
    }
    if (menu.status != null) {
      setFields.status = menu.status;
    }
    if (menu.perms != null) {
      setFields.perms = menu.perms;
    }
    if (menu.icon != null && menu.icon !== '') {
      setFields.icon = menu.icon;
    }
    if (menu.remark != null && menu.remark !== '') {
      setFields.remark = menu.remark;
    }

    // 设置更新信息
    setFields.updateBy = ctx.state.user.userName;

    const result = await this.model.SysMenu.updateOne(
      { _id: this._toObjectId(menu.menuId) },
      { $set: setFields }
    );

    return result.modifiedCount;
  }

  /**
   * 删除菜单
   * @param {string} menuId - 菜单ID
   * @return {number} 影响的文档数
   */
  async deleteMenuById(menuId) {
    const result = await this.model.SysMenu.deleteOne({
      _id: this._toObjectId(menuId),
    });
    return result.deletedCount;
  }

  /**
   * 根据角色ID查询权限标识
   * @param {string} roleId - 角色ID
   * @return {array} 权限标识列表
   */
  async selectMenuPermsByRoleId(roleId) {
    // 1. 获取角色关联的菜单ID列表
    const roleMenus = await this.model.SysRoleMenu
      .find({ roleId: this._toObjectId(roleId) })
      .select('menuId')
      .lean();
    const menuIds = roleMenus.map(rm => rm.menuId);

    if (menuIds.length === 0) {
      return [];
    }

    // 2. 查询权限标识
    const permsList = await this.model.SysMenu.distinct('perms', {
      _id: { $in: menuIds },
      status: '0',
    });

    const permsSet = [];

    // 处理每个权限字符串，按逗号分割
    for (const perm of (permsList || [])) {
      if (perm && perm.trim()) {
        permsSet.push(...perm.trim().split(','));
      }
    }

    // 去重并返回
    return [...new Set(permsSet)];
  }

  /**
   * 构建前端路由所需要的菜单（完整版）
   * @param {array} menus - 菜单列表
   * @return {array} 路由列表
   */
  buildMenus(menus) {
    const routers = [];

    for (const menu of menus) {
      const router = {
        hidden: menu.visible === '1',
        name: this.getRouteName(menu),
        path: this.getRouterPath(menu),
        component: this.getComponent(menu),
        query: menu.query,
        meta: {
          title: menu.menuName,
          icon: menu.icon,
          noCache: menu.isCache === '1',
          link: null, // menu.path
        },
      };

      const cMenus = menu.children || [];

      // 目录类型并且有子菜单
      if (cMenus.length > 0 && menu.menuType === TYPE_DIR) {
        router.alwaysShow = true;
        router.redirect = 'noRedirect';
        router.children = this.buildMenus(cMenus);
      }
      // 菜单内部跳转
      else if (this.isMenuFrame(menu)) {
        router.meta = null;
        const children = {
          path: menu.path,
          component: menu.component,
          name: this.getRouteNameFromPath(menu.routeName, menu.path),
          meta: {
            title: menu.menuName,
            icon: menu.icon,
            noCache: menu.isCache === '1',
            link: null, // menu.path
          },
          query: menu.query,
        };
        router.children = [children];
      }
      // 一级目录内链
      else if (String(menu.parentId || null) === 'null' && this.isInnerLink(menu)) {
        router.meta = {
          title: menu.menuName,
          icon: menu.icon,
        };
        router.path = '/';
        const routerPath = this.innerLinkReplaceEach(menu.path);
        const children = {
          path: routerPath,
          component: INNER_LINK,
          name: this.getRouteNameFromPath(menu.routeName, routerPath),
          meta: {
            title: menu.menuName,
            icon: menu.icon,
            link: menu.path,
          },
        };
        router.children = [children];
      }

      routers.push(router);
    }

    return routers;
  }

  /**
   * 获取路由名称
   * @param {object} menu - 菜单信息
   * @return {string} 路由名称
   */
  getRouteName(menu) {
    // 非外链并且是一级目录（类型为目录）
    if (this.isMenuFrame(menu)) {
      return '';
    }
    return this.getRouteNameFromPath(menu.routeName, menu.path);
  }

  /**
   * 获取路由名称，如没有配置路由名称则取路由地址
   * @param {string} name - 路由名称
   * @param {string} path - 路由地址
   * @return {string} 路由名称（首字母大写）
   */
  getRouteNameFromPath(name, path) {
    const routerName = name || path || '';
    // 首字母大写
    return routerName.charAt(0).toUpperCase() + routerName.slice(1);
  }

  /**
   * 获取路由地址
   * @param {object} menu - 菜单信息
   * @return {string} 路由地址
   */
  getRouterPath(menu) {
    let routerPath = menu.path;

    // 内链打开外网方式
    if (String(menu.parentId || null) !== 'null' && this.isInnerLink(menu)) {
      routerPath = this.innerLinkReplaceEach(routerPath);
    }
    // 非外链并且是一级目录（类型为目录）
    else if (
      String(menu.parentId || null) === 'null' &&
      menu.menuType === TYPE_DIR &&
      menu.isFrame === NO_FRAME
    ) {
      routerPath = '/' + menu.path;
    }
    // 非外链并且是一级目录（类型为菜单）
    else if (this.isMenuFrame(menu)) {
      routerPath = '/';
    }

    return routerPath;
  }

  /**
   * 获取组件信息
   * @param {object} menu - 菜单信息
   * @return {string} 组件信息
   */
  getComponent(menu) {
    let component = LAYOUT;

    if (menu.component && !this.isMenuFrame(menu)) {
      component = menu.component;
    } else if (
      !menu.component &&
      String(menu.parentId || null) !== 'null' &&
      this.isInnerLink(menu)
    ) {
      component = INNER_LINK;
    } else if (!menu.component && this.isParentView(menu)) {
      component = PARENT_VIEW;
    }

    return component;
  }

  /**
   * 是否为菜单内部跳转
   * @param {object} menu - 菜单信息
   * @return {boolean} 结果
   */
  isMenuFrame(menu) {
    return (
      String(menu.parentId || null) === 'null' &&
      menu.menuType === TYPE_MENU &&
      menu.isFrame === NO_FRAME
    );
  }

  /**
   * 是否为内链组件
   * @param {object} menu - 菜单信息
   * @return {boolean} 结果
   */
  isInnerLink(menu) {
    return menu.isFrame === NO_FRAME && this.isHttp(menu.path);
  }

  /**
   * 是否为parent_view组件
   * @param {object} menu - 菜单信息
   * @return {boolean} 结果
   */
  isParentView(menu) {
    return String(menu.parentId || null) !== 'null' && menu.menuType === TYPE_DIR;
  }

  /**
   * 判断是否为http(s)://开头
   * @param {string} link - 链接
   * @return {boolean} 结果
   */
  isHttp(link) {
    if (!link) return false;
    return link.startsWith('http://') || link.startsWith('https://');
  }

  /**
   * 内链域名特殊字符替换
   * @param {string} path - 路径
   * @return {string} 替换后的内链域名
   */
  innerLinkReplaceEach(path) {
    if (!path) return '';

    return path
      .replace(/http:\/\//g, '')
      .replace(/https:\/\//g, '')
      .replace(/www\./g, '')
      .replace(/\./g, '/')
      .replace(/:/g, '/');
  }
}

module.exports = MenuService;
