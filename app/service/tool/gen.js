/*
 * @Description: 代码生成服务层（使用 egg-mysql 原生方式）
 * @Author:
 * @Date: 2025-11-08
 */

const Service = require('egg').Service;
const path = require('path');
const fs = require('fs-extra');
const archiver = require('archiver');
const mysql2 = require('mysql2');
const GenUtils = require('../../util/genUtils');
const VelocityUtils = require('../../util/velocityUtils');
const GenConstants = require('../../constant/genConstants');
const SqlUtils = require('../../util/sqlUtils');

class GenService extends Service {
  constructor(...args) {
    super(...args);
    this.GEN_TABLE_COLUMNS = 'table_id, table_name, table_comment, sub_table_name, sub_table_fk_name, class_name, tpl_category, tpl_web_type, package_name, module_name, business_name, function_name, function_author, gen_type, gen_path, options, create_by, create_time, update_by, update_time, remark';
    this.GEN_TABLE_COLUMN_COLUMNS = 'column_id, table_id, column_name, column_comment, column_type, java_type, java_field, is_pk, is_increment, is_required, is_insert, is_edit, is_list, is_query, query_type, html_type, dict_type, sort, create_by, create_time, update_by, update_time';
  }

  /** 获取 ruoyi 数据库连接 */
  _getDb() {
    return this.app.mysql.get('ruoyi');
  }

  /** 转义 SQL 值（防止注入） */
  _escape(val) {
    return mysql2.escape(val);
  }

  /** 拼接 WHERE 子句 */
  _where(conditions) {
    if (!conditions || conditions.length === 0) return '';
    return ' where ' + conditions.join(' and ');
  }

  /**
   * 构建 selectGenTableList 的 WHERE 条件
   * 对应 GenTableMapper.xml 中 selectGenTableList
   */
  _buildSelectGenTableWhereConditions(params) {
    const conditions = [];
    if (params.tableName != null && params.tableName !== '') {
      conditions.push(`lower(table_name) like lower(concat('%', ${this._escape(params.tableName)}, '%'))`);
    }
    if (params.tableComment != null && params.tableComment !== '') {
      conditions.push(`lower(table_comment) like lower(concat('%', ${this._escape(params.tableComment)}, '%'))`);
    }
    const beginTime = (params.params && params.params.beginTime) || params['params[beginTime]'];
    const endTime = (params.params && params.params.endTime) || params['params[endTime]'];
    if (beginTime != null && beginTime !== '') {
      conditions.push(`date_format(create_time,'%Y%m%d') >= date_format(${this._escape(beginTime)},'%Y%m%d')`);
    }
    if (endTime != null && endTime !== '') {
      conditions.push(`date_format(create_time,'%Y%m%d') <= date_format(${this._escape(endTime)},'%Y%m%d')`);
    }
    return conditions;
  }

  /**
   * 构建 selectDbTableList 的 WHERE 条件
   * 对应 GenTableMapper.xml 中 selectDbTableList
   */
  _buildSelectDbTableWhereConditions(params) {
    const conditions = [];
    conditions.push('table_schema = (select database())');
    conditions.push("table_name NOT LIKE 'qrtz\\_%'");
    conditions.push("table_name NOT LIKE 'gen\\_%'");
    conditions.push('table_name NOT IN (select table_name from gen_table)');
    if (params.tableName != null && params.tableName !== '') {
      conditions.push(`lower(table_name) like lower(concat('%', ${this._escape(params.tableName)}, '%'))`);
    }
    if (params.tableComment != null && params.tableComment !== '') {
      conditions.push(`lower(table_comment) like lower(concat('%', ${this._escape(params.tableComment)}, '%'))`);
    }
    const beginTime = (params.params && params.params.beginTime) || params.beginTime;
    const endTime = (params.params && params.params.endTime) || params.endTime;
    if (beginTime != null && beginTime !== '') {
      conditions.push(`date_format(create_time,'%Y%m%d') >= date_format(${this._escape(beginTime)},'%Y%m%d')`);
    }
    if (endTime != null && endTime !== '') {
      conditions.push(`date_format(create_time,'%Y%m%d') <= date_format(${this._escape(endTime)},'%Y%m%d')`);
    }
    return conditions;
  }

  /**
   * 分页查询代码生成表列表
   * 对应 GenTableMapper.xml 中 selectGenTableList
   */
  async selectGenTablePage(params = {}) {
    const { ctx } = this;
    const db = this._getDb();
    const whereConditions = this._buildSelectGenTableWhereConditions(params);
    const baseSql = `select ${this.GEN_TABLE_COLUMNS} from gen_table${this._where(whereConditions)}`;
    return await ctx.helper.pageQuery(baseSql, params, db);
  }

  /**
   * 分页查询数据库表列表
   * 对应 GenTableMapper.xml 中 selectDbTableList
   */
  async selectDbTablePage(params = {}) {
    const { ctx } = this;
    const db = this._getDb();
    const whereConditions = this._buildSelectDbTableWhereConditions(params);
    const baseSql = `select table_name, table_comment, create_time, update_time from information_schema.tables${this._where(whereConditions)} order by create_time desc`;
    return await ctx.helper.pageQuery(baseSql, params, db);
  }


  /**
   * 查询代码生成表列表
   * @param {object} genTable - 查询参数
   * @return {array} 代码生成表列表
   */
  async selectGenTableList(genTable = {}) {
    const { ctx } = this;

    try {
      const db = this._getDb();
      const whereConditions = this._buildSelectGenTableWhereConditions(genTable);
      const sql = `select ${this.GEN_TABLE_COLUMNS} from gen_table${this._where(whereConditions)}`;
      const result = await db.selects(sql);

      return result || [];
    } catch (err) {
      ctx.logger.error('查询代码生成表列表失败:', err);
      return [];
    }
  }

  /**
   * 查询数据库表列表
   * @param {object} genTable - 查询参数
   * @return {array} 数据库表列表
   */
  async selectDbTableList(genTable = {}) {
    const { ctx } = this;

    try {
      const db = this._getDb();
      const whereConditions = this._buildSelectDbTableWhereConditions(genTable);
      const sql = `select table_name, table_comment, create_time, update_time from information_schema.tables${this._where(whereConditions)} order by create_time desc`;
      const result = await db.selects(sql);

      return result || [];
    } catch (err) {
      ctx.logger.error('查询数据库表列表失败:', err);
      return [];
    }
  }

  /**
   * 根据表名查询数据库表列表
   * @param {array} tableNames - 表名数组
   * @return {array} 数据库表列表
   */
  async selectDbTableListByNames(tableNames) {
    const { ctx } = this;

    try {
      const db = this._getDb();
      const escapedNames = tableNames.map(name => this._escape(name)).join(', ');
      const sql = `select table_name, table_comment, create_time, update_time from information_schema.tables where table_name NOT LIKE 'qrtz\\_%' and table_name NOT LIKE 'gen\\_%' and table_schema = (select database()) and table_name in (${escapedNames})`;
      const result = await db.selects(sql);

      return result || [];
    } catch (err) {
      ctx.logger.error('查询数据库表列表失败:', err);
      return [];
    }
  }

  /**
   * 查询所有表信息
   * @return {array} 表信息集合
   */
  async selectGenTableAll() {
    const { ctx } = this;

    try {
      const db = this._getDb();
      const sql = `select ${this.GEN_TABLE_COLUMNS} from gen_table`;
      const result = await db.selects(sql);

      return result || [];
    } catch (err) {
      ctx.logger.error('查询所有表信息失败:', err);
      return [];
    }
  }

  /**
   * 根据表ID查询代码生成表信息
   * @param {number} tableId - 表ID
   * @return {object} 表信息
   */
  async selectGenTableById(tableId) {
    const { ctx } = this;

    try {
      const db = this._getDb();
      const sql = `select ${this.GEN_TABLE_COLUMNS} from gen_table where table_id = ${this._escape(tableId)}`;
      const result = await db.selects(sql);

      if (result != null && result.length > 0) {
        const genTable = result[0];
        await this.setTableFromOptions(genTable);
        // 查询列信息
        genTable.columns = await this.selectGenTableColumnListByTableId(tableId);
        
        // 调试日志
        ctx.logger.info(`查询表 ${tableId} 的列信息:`, {
          columnsType: typeof genTable.columns,
          isArray: Array.isArray(genTable.columns),
          columnsLength: Array.isArray(genTable.columns) ? genTable.columns.length : 'N/A',
          columns: genTable.columns
        });
        
        return genTable;
      }
      
      return null;
    } catch (err) {
      ctx.logger.error('查询代码生成表信息失败:', err);
      return null;
    }
  }

  /**
   * 根据表名查询代码生成表信息
   * @param {string} tableName - 表名
   * @return {object} 表信息
   */
  async selectGenTableByName(tableName) {
    const { ctx } = this;

    try {
      const db = this._getDb();
      const sql = `select ${this.GEN_TABLE_COLUMNS} from gen_table where table_name = ${this._escape(tableName)}`;
      const result = await db.selects(sql);

      if (result != null && result.length > 0) {
        const genTable = result[0];
        await this.setTableFromOptions(genTable);
        // 查询列信息
        genTable.columns = await this.selectGenTableColumnListByTableId(genTable.tableId);
        return genTable;
      }

      return null;
    } catch (err) {
      ctx.logger.error('查询代码生成表信息失败:', err);
      return null;
    }
  }

  /**
   * 查询表字段列表
   * @param {number} tableId - 表ID
   * @return {array} 字段列表
   */
  async selectGenTableColumnListByTableId(tableId) {
    const { ctx } = this;
    
    try {
      const db = this._getDb();
      const sql = `select ${this.GEN_TABLE_COLUMN_COLUMNS} from gen_table_column where table_id = ${this._escape(tableId)} order by sort`;
      const result = await db.selects(sql);

      // 确保返回数组
      if (!result) {
        ctx.logger.warn(`查询表 ${tableId} 的字段列表为空`);
        return [];
      }
      
      if (!Array.isArray(result)) {
        ctx.logger.error(`查询表 ${tableId} 的字段列表不是数组:`, typeof result, result);
        return [];
      }
      
      // 处理以 is 开头的属性，生成不带 is 的对应属性
      result.forEach(column => {
        Object.keys(column).forEach(key => {
          // 如果属性名以 is 开头且长度大于 2
          if (key.startsWith('is') && key.length > 2) {
            // 生成不带 is 的属性名（首字母小写）
            const newKey = key.charAt(2).toLowerCase() + key.slice(3);
            column[newKey] = column[key] === '1';
          }
        });
      });
      
      ctx.logger.info(`查询表 ${tableId} 的字段列表成功，共 ${result.length} 个字段`);
      return result;
    } catch (err) {
      ctx.logger.error('查询表字段列表失败:', err);
      return [];
    }
  }

  /**
   * 根据表名查询数据库表字段
   * @param {string} tableName - 表名
   * @return {array} 字段列表
   */
  async selectDbTableColumnsByName(tableName) {
    const { ctx } = this;

    try {
      const db = this._getDb();
      const sql = `select column_name, (case when (is_nullable = 'no' and column_key != 'PRI') then '1' else '0' end) as is_required, (case when column_key = 'PRI' then '1' else '0' end) as is_pk, ordinal_position as sort, column_comment, (case when extra = 'auto_increment' then '1' else '0' end) as is_increment, column_type from information_schema.columns where table_schema = (select database()) and table_name = ${this._escape(tableName)} order by ordinal_position`;
      const result = await db.selects(sql);

      // 确保返回数组
      if (!result) {
        ctx.logger.warn(`查询表 ${tableName} 的字段为空`);
        return [];
      }
      
      if (!Array.isArray(result)) {
        ctx.logger.warn(`查询表 ${tableName} 的字段结果不是数组:`, typeof result, result);
        return [];
      }
      
      return result;
    } catch (err) {
      ctx.logger.error('查询表字段失败:', err);
      return [];
    }
  }

  /**
   * 导入表结构
   * @param {array} tableNames - 表名数组
   * @return {number} 影响行数
   */
  async importGenTable(tableNames) {
    const { ctx } = this;
    
    try {
      const operName = ctx.state.user.userName || 'admin';
      
      // 查询表信息
      const tableList = await this.selectDbTableListByNames(tableNames);

      const db = this._getDb();
      let count = 0;
      for (const table of tableList) {
        const tableName = table.tableName;

        // 初始化表信息
        GenUtils.initTable(table, operName);

        // 动态构建 INSERT 语句 — 对应 insertGenTable
        const fields = [];
        const values = [];

        if (table.tableName != null) {
          fields.push('table_name');
          values.push(this._escape(table.tableName));
        }
        if (table.tableComment != null && table.tableComment !== '') {
          fields.push('table_comment');
          values.push(this._escape(table.tableComment));
        }
        if (table.className != null && table.className !== '') {
          fields.push('class_name');
          values.push(this._escape(table.className));
        }
        if (table.tplCategory != null && table.tplCategory !== '') {
          fields.push('tpl_category');
          values.push(this._escape(table.tplCategory));
        }
        if (table.tplWebType != null && table.tplWebType !== '') {
          fields.push('tpl_web_type');
          values.push(this._escape(table.tplWebType));
        }
        if (table.packageName != null && table.packageName !== '') {
          fields.push('package_name');
          values.push(this._escape(table.packageName));
        }
        if (table.moduleName != null && table.moduleName !== '') {
          fields.push('module_name');
          values.push(this._escape(table.moduleName));
        }
        if (table.businessName != null && table.businessName !== '') {
          fields.push('business_name');
          values.push(this._escape(table.businessName));
        }
        if (table.functionName != null && table.functionName !== '') {
          fields.push('function_name');
          values.push(this._escape(table.functionName));
        }
        if (table.functionAuthor != null && table.functionAuthor !== '') {
          fields.push('function_author');
          values.push(this._escape(table.functionAuthor));
        }
        if (table.genType != null && table.genType !== '') {
          fields.push('gen_type');
          values.push(this._escape(table.genType));
        }
        if (table.genPath != null && table.genPath !== '') {
          fields.push('gen_path');
          values.push(this._escape(table.genPath));
        }
        if (table.remark != null && table.remark !== '') {
          fields.push('remark');
          values.push(this._escape(table.remark));
        }
        if (table.createBy != null && table.createBy !== '') {
          fields.push('create_by');
          values.push(this._escape(table.createBy));
        }
        fields.push('create_time');
        values.push('sysdate()');

        const insertSql = `insert into gen_table (${fields.join(', ')}) values(${values.join(', ')})`;
        const tableId = await db.insert(insertSql);

        if (tableId > 0) {
          // 保存列信息
          const genTableColumns = await this.selectDbTableColumnsByName(tableName);

          // 确保 genTableColumns 是数组
          if (!Array.isArray(genTableColumns)) {
            ctx.logger.error(`表 ${tableName} 的字段信息不是数组类型:`, typeof genTableColumns);
            throw new Error(`获取表 ${tableName} 的字段信息失败`);
          }

          if (genTableColumns.length === 0) {
            ctx.logger.warn(`表 ${tableName} 没有字段信息`);
          }

          for (const column of genTableColumns) {
            GenUtils.initColumnField(column, table);
            column.tableId = tableId;

            // 动态构建 INSERT 语句 — 对应 insertGenTableColumn
            const colFields = [];
            const colValues = [];

            if (column.tableId != null && column.tableId !== '') {
              colFields.push('table_id');
              colValues.push(this._escape(column.tableId));
            }
            if (column.columnName != null && column.columnName !== '') {
              colFields.push('column_name');
              colValues.push(this._escape(column.columnName));
            }
            if (column.columnComment != null && column.columnComment !== '') {
              colFields.push('column_comment');
              colValues.push(this._escape(column.columnComment));
            }
            if (column.columnType != null && column.columnType !== '') {
              colFields.push('column_type');
              colValues.push(this._escape(column.columnType));
            }
            if (column.javaType != null && column.javaType !== '') {
              colFields.push('java_type');
              colValues.push(this._escape(column.javaType));
            }
            if (column.javaField != null && column.javaField !== '') {
              colFields.push('java_field');
              colValues.push(this._escape(column.javaField));
            }
            if (column.isPk != null && column.isPk !== '') {
              colFields.push('is_pk');
              colValues.push(this._escape(column.isPk));
            }
            if (column.isIncrement != null && column.isIncrement !== '') {
              colFields.push('is_increment');
              colValues.push(this._escape(column.isIncrement));
            }
            if (column.isRequired != null && column.isRequired !== '') {
              colFields.push('is_required');
              colValues.push(this._escape(column.isRequired));
            }
            if (column.isInsert != null && column.isInsert !== '') {
              colFields.push('is_insert');
              colValues.push(this._escape(column.isInsert));
            }
            if (column.isEdit != null && column.isEdit !== '') {
              colFields.push('is_edit');
              colValues.push(this._escape(column.isEdit));
            }
            if (column.isList != null && column.isList !== '') {
              colFields.push('is_list');
              colValues.push(this._escape(column.isList));
            }
            if (column.isQuery != null && column.isQuery !== '') {
              colFields.push('is_query');
              colValues.push(this._escape(column.isQuery));
            }
            if (column.queryType != null && column.queryType !== '') {
              colFields.push('query_type');
              colValues.push(this._escape(column.queryType));
            }
            if (column.htmlType != null && column.htmlType !== '') {
              colFields.push('html_type');
              colValues.push(this._escape(column.htmlType));
            }
            if (column.dictType != null && column.dictType !== '') {
              colFields.push('dict_type');
              colValues.push(this._escape(column.dictType));
            }
            if (column.sort != null) {
              colFields.push('sort');
              colValues.push(this._escape(column.sort));
            }
            if (column.createBy != null && column.createBy !== '') {
              colFields.push('create_by');
              colValues.push(this._escape(column.createBy));
            }
            colFields.push('create_time');
            colValues.push('sysdate()');

            const insertColumnSql = `insert into gen_table_column (${colFields.join(', ')}) values(${colValues.join(', ')})`;
            await db.insert(insertColumnSql);
          }
          
          count++;
        }
      }
      
      return count;
    } catch (err) {
      ctx.logger.error('导入表结构失败:', err);
      throw new Error('导入失败：' + err.message);
    }
  }

  /**
   * 修改代码生成配置
   * @param {object} genTable - 表配置
   * @return {number} 影响行数
   */
  async updateGenTable(genTable) {
    const { ctx } = this;
    
    try {
      // 序列化 options
      const options = JSON.stringify(genTable.params || {});
      genTable.options = options;

      const db = this._getDb();

      // 动态构建 UPDATE SET 子句 — 对应 updateGenTable
      const setClauses = [];

      if (genTable.tableName != null) {
        setClauses.push(`table_name = ${this._escape(genTable.tableName)}`);
      }
      if (genTable.tableComment != null && genTable.tableComment !== '') {
        setClauses.push(`table_comment = ${this._escape(genTable.tableComment)}`);
      }
      if (genTable.subTableName != null) {
        setClauses.push(`sub_table_name = ${this._escape(genTable.subTableName)}`);
      }
      if (genTable.subTableFkName != null) {
        setClauses.push(`sub_table_fk_name = ${this._escape(genTable.subTableFkName)}`);
      }
      if (genTable.className != null && genTable.className !== '') {
        setClauses.push(`class_name = ${this._escape(genTable.className)}`);
      }
      if (genTable.functionAuthor != null && genTable.functionAuthor !== '') {
        setClauses.push(`function_author = ${this._escape(genTable.functionAuthor)}`);
      }
      if (genTable.genType != null && genTable.genType !== '') {
        setClauses.push(`gen_type = ${this._escape(genTable.genType)}`);
      }
      if (genTable.genPath != null && genTable.genPath !== '') {
        setClauses.push(`gen_path = ${this._escape(genTable.genPath)}`);
      }
      if (genTable.tplCategory != null && genTable.tplCategory !== '') {
        setClauses.push(`tpl_category = ${this._escape(genTable.tplCategory)}`);
      }
      if (genTable.tplWebType != null && genTable.tplWebType !== '') {
        setClauses.push(`tpl_web_type = ${this._escape(genTable.tplWebType)}`);
      }
      if (genTable.packageName != null && genTable.packageName !== '') {
        setClauses.push(`package_name = ${this._escape(genTable.packageName)}`);
      }
      if (genTable.moduleName != null && genTable.moduleName !== '') {
        setClauses.push(`module_name = ${this._escape(genTable.moduleName)}`);
      }
      if (genTable.businessName != null && genTable.businessName !== '') {
        setClauses.push(`business_name = ${this._escape(genTable.businessName)}`);
      }
      if (genTable.functionName != null && genTable.functionName !== '') {
        setClauses.push(`function_name = ${this._escape(genTable.functionName)}`);
      }
      if (genTable.options != null && genTable.options !== '') {
        setClauses.push(`options = ${this._escape(genTable.options)}`);
      }
      if (genTable.updateBy != null && genTable.updateBy !== '') {
        setClauses.push(`update_by = ${this._escape(genTable.updateBy)}`);
      }
      if (genTable.remark != null) {
        setClauses.push(`remark = ${this._escape(genTable.remark)}`);
      }
      setClauses.push('update_time = sysdate()');

      const updateSql = `update gen_table set ${setClauses.join(', ')} where table_id = ${this._escape(genTable.tableId)}`;
      const result = await db.update(updateSql);

      if (result > 0) {
        // 更新列信息
        if (genTable.columns && genTable.columns.length > 0) {
          for (const column of genTable.columns) {
            // 动态构建 UPDATE SET 子句 — 对应 updateGenTableColumn
            const colSetClauses = [];

            if (column.columnComment != null) {
              colSetClauses.push(`column_comment = ${this._escape(column.columnComment)}`);
            }
            if (column.javaType != null) {
              colSetClauses.push(`java_type = ${this._escape(column.javaType)}`);
            }
            if (column.javaField != null) {
              colSetClauses.push(`java_field = ${this._escape(column.javaField)}`);
            }
            if (column.isInsert != null) {
              colSetClauses.push(`is_insert = ${this._escape(column.isInsert)}`);
            }
            if (column.isEdit != null) {
              colSetClauses.push(`is_edit = ${this._escape(column.isEdit)}`);
            }
            if (column.isList != null) {
              colSetClauses.push(`is_list = ${this._escape(column.isList)}`);
            }
            if (column.isQuery != null) {
              colSetClauses.push(`is_query = ${this._escape(column.isQuery)}`);
            }
            if (column.isRequired != null) {
              colSetClauses.push(`is_required = ${this._escape(column.isRequired)}`);
            }
            if (column.queryType != null) {
              colSetClauses.push(`query_type = ${this._escape(column.queryType)}`);
            }
            if (column.htmlType != null) {
              colSetClauses.push(`html_type = ${this._escape(column.htmlType)}`);
            }
            if (column.dictType != null) {
              colSetClauses.push(`dict_type = ${this._escape(column.dictType)}`);
            }
            if (column.sort != null) {
              colSetClauses.push(`sort = ${this._escape(column.sort)}`);
            }
            if (column.updateBy != null) {
              colSetClauses.push(`update_by = ${this._escape(column.updateBy)}`);
            }
            colSetClauses.push('update_time = sysdate()');

            const updateColumnSql = `update gen_table_column set ${colSetClauses.join(', ')} where column_id = ${this._escape(column.columnId)}`;
            await db.update(updateColumnSql);
          }
        }
      }
      
      return result;
    } catch (err) {
      ctx.logger.error('修改代码生成配置失败:', err);
      throw new Error('修改失败：' + err.message);
    }
  }

  /**
   * 删除代码生成表配置
   * @param {array} tableIds - 表ID数组
   * @return {number} 影响行数
   */
  async deleteGenTableByIds(tableIds) {
    const { ctx } = this;
    
    try {
      const db = this._getDb();
      const escapedIds = tableIds.map(id => this._escape(id)).join(', ');

      // 删除列信息 — 对应 deleteGenTableColumnByIds
      await db.del(`delete from gen_table_column where table_id in (${escapedIds})`);

      // 删除表信息 — 对应 deleteGenTableByIds
      const result = await db.del(`delete from gen_table where table_id in (${escapedIds})`);

      return result || 0;
    } catch (err) {
      ctx.logger.error('删除代码生成表配置失败:', err);
      throw new Error('删除失败：' + err.message);
    }
  }

  /**
   * 预览代码
   * @param {number} tableId - 表ID
   * @return {object} 代码预览
   */
  async previewCode(tableId) {
    const { ctx, app } = this;
    
    try {
      // 查询表信息
      const table = await this.selectGenTableById(tableId);
      if (!table) {
        throw new Error('表信息不存在');
      }
      
      // 设置主子表信息
      await this.setSubTable(table);
      
      // 设置主键列信息
      this.setPkColumn(table);
      
      // 准备模板上下文
      const context = VelocityUtils.prepareContext(table);
      
      // 获取模板列表
      const templates = VelocityUtils.getTemplateList(table.tplCategory, table.tplWebType);
      
      const dataMap = {};
      
      // 渲染每个模板
      for (const template of templates) {
        const templatePath = path.join(app.baseDir, 'app/templates', template);
        
        if (await fs.pathExists(templatePath)) {
          const templateContent = await fs.readFile(templatePath, 'utf-8');
          let code = VelocityUtils.render(templateContent, context);
          // 移除多余的空行
          code = VelocityUtils.removeExtraBlankLines(code);
          dataMap[template] = code;
        } else {
          ctx.logger.warn(`模板文件不存在: ${templatePath}`);
        }
      }
      
      return dataMap;
    } catch (err) {
      ctx.logger.error('预览代码失败:', err);
      throw new Error('预览失败：' + err.message);
    }
  }

  /**
   * 生成代码（下载）
   * @param {string} tableName - 表名
   * @return {Buffer} 代码压缩包
   */
  async downloadCode(tableName) {
    const { ctx } = this;
    
    try {
      // 查询表信息
      const table = await this.selectGenTableByName(tableName);
      if (!table) {
        throw new Error('表信息不存在');
      }
      
      // 设置主子表信息
      await this.setSubTable(table);
      
      // 设置主键列信息
      this.setPkColumn(table);
      
      // 生成代码
      const codeMap = await this.generatorCode(table);
      
      // 创建 zip 压缩包
      const archive = archiver('zip', {
        zlib: { level: 9 }
      });
      
      // 添加文件到压缩包
      for (const [fileName, content] of Object.entries(codeMap)) {
        archive.append(content, { name: fileName });
      }
      
      // 完成压缩
      archive.finalize();
      
      // 转换为 Buffer
      const chunks = [];
      archive.on('data', chunk => chunks.push(chunk));
      
      return new Promise((resolve, reject) => {
        archive.on('end', () => {
          resolve(Buffer.concat(chunks));
        });
        archive.on('error', reject);
      });
    } catch (err) {
      ctx.logger.error('生成代码失败:', err);
      throw new Error('生成失败：' + err.message);
    }
  }

  /**
   * 生成代码（自定义路径）
   * @param {string} tableName - 表名
   * @return {number} 影响行数
   */
  async genCode(tableName) {
    const { ctx, app } = this;
    
    try {
      // 查询表信息
      const table = await this.selectGenTableByName(tableName);
      if (!table) {
        throw new Error('表信息不存在');
      }
      
      // 设置主子表信息
      await this.setSubTable(table);
      
      // 设置主键列信息
      this.setPkColumn(table);
      
      // 生成代码
      const codeMap = await this.generatorCode(table);
      
      // 写入文件
      let count = 0;
      for (const [fileName, content] of Object.entries(codeMap)) {
        // 排除 sql、api.js、vue 文件（这些通常不直接写入后端项目）
        if (!fileName.includes('.sql') && 
            !fileName.includes('api.js') && 
            !fileName.includes('.vue')) {
          const filePath = this.getGenPath(table, fileName);
          await fs.ensureDir(path.dirname(filePath));
          await fs.writeFile(filePath, content, 'utf-8');
          count++;
        }
      }
      
      return count;
    } catch (err) {
      ctx.logger.error('生成代码失败:', err);
      throw new Error('生成失败：' + err.message);
    }
  }

  /**
   * 同步数据库
   * @param {string} tableName - 表名
   * @return {number} 影响行数
   */
  async synchDb(tableName) {
    const { ctx } = this;
    
    try {
      // 查询表信息
      const table = await this.selectGenTableByName(tableName);
      if (!table) {
        throw new Error('表信息不存在');
      }
      
      const tableColumns = table.columns || [];
      const tableColumnMap = {};
      for (const column of tableColumns) {
        tableColumnMap[column.columnName] = column;
      }
      
      // 查询数据库表列
      const dbTableColumns = await this.selectDbTableColumnsByName(tableName);
      if (!dbTableColumns || dbTableColumns.length === 0) {
        throw new Error('同步数据失败，原表结构不存在');
      }
      
      const dbTableColumnNames = dbTableColumns.map(col => col.columnName);
      const db = this._getDb();

      // 同步列信息
      for (const column of dbTableColumns) {
        GenUtils.initColumnField(column, table);
        
        if (tableColumnMap[column.columnName]) {
          // 更新已有列
          const prevColumn = tableColumnMap[column.columnName];
          column.columnId = prevColumn.columnId;
          
          if (column.isList === '1') {
            // 如果是列表，继续保留查询方式/字典类型选项
            column.dictType = prevColumn.dictType;
            column.queryType = prevColumn.queryType;
          }
          
          if (prevColumn.isRequired && !column.isPk &&
              (column.isInsert === '1' || column.isEdit === '1')) {
            // 继续保留必填/显示类型选项
            column.isRequired = prevColumn.isRequired;
            column.htmlType = prevColumn.htmlType;
          }

          // 动态构建 UPDATE SET 子句 — 对应 updateGenTableColumn
          const colSetClauses = [];

          if (column.columnComment != null) {
            colSetClauses.push(`column_comment = ${this._escape(column.columnComment)}`);
          }
          if (column.javaType != null) {
            colSetClauses.push(`java_type = ${this._escape(column.javaType)}`);
          }
          if (column.javaField != null) {
            colSetClauses.push(`java_field = ${this._escape(column.javaField)}`);
          }
          if (column.isInsert != null) {
            colSetClauses.push(`is_insert = ${this._escape(column.isInsert)}`);
          }
          if (column.isEdit != null) {
            colSetClauses.push(`is_edit = ${this._escape(column.isEdit)}`);
          }
          if (column.isList != null) {
            colSetClauses.push(`is_list = ${this._escape(column.isList)}`);
          }
          if (column.isQuery != null) {
            colSetClauses.push(`is_query = ${this._escape(column.isQuery)}`);
          }
          if (column.isRequired != null) {
            colSetClauses.push(`is_required = ${this._escape(column.isRequired)}`);
          }
          if (column.queryType != null) {
            colSetClauses.push(`query_type = ${this._escape(column.queryType)}`);
          }
          if (column.htmlType != null) {
            colSetClauses.push(`html_type = ${this._escape(column.htmlType)}`);
          }
          if (column.dictType != null) {
            colSetClauses.push(`dict_type = ${this._escape(column.dictType)}`);
          }
          if (column.sort != null) {
            colSetClauses.push(`sort = ${this._escape(column.sort)}`);
          }
          if (column.updateBy != null) {
            colSetClauses.push(`update_by = ${this._escape(column.updateBy)}`);
          }
          colSetClauses.push('update_time = sysdate()');

          const updateColumnSql = `update gen_table_column set ${colSetClauses.join(', ')} where column_id = ${this._escape(column.columnId)}`;
          await db.update(updateColumnSql);
        } else {
          // 新增列
          column.tableId = table.tableId;

          // 动态构建 INSERT 语句 — 对应 insertGenTableColumn
          const colFields = [];
          const colValues = [];

          if (column.tableId != null && column.tableId !== '') {
            colFields.push('table_id');
            colValues.push(this._escape(column.tableId));
          }
          if (column.columnName != null && column.columnName !== '') {
            colFields.push('column_name');
            colValues.push(this._escape(column.columnName));
          }
          if (column.columnComment != null && column.columnComment !== '') {
            colFields.push('column_comment');
            colValues.push(this._escape(column.columnComment));
          }
          if (column.columnType != null && column.columnType !== '') {
            colFields.push('column_type');
            colValues.push(this._escape(column.columnType));
          }
          if (column.javaType != null && column.javaType !== '') {
            colFields.push('java_type');
            colValues.push(this._escape(column.javaType));
          }
          if (column.javaField != null && column.javaField !== '') {
            colFields.push('java_field');
            colValues.push(this._escape(column.javaField));
          }
          if (column.isPk != null && column.isPk !== '') {
            colFields.push('is_pk');
            colValues.push(this._escape(column.isPk));
          }
          if (column.isIncrement != null && column.isIncrement !== '') {
            colFields.push('is_increment');
            colValues.push(this._escape(column.isIncrement));
          }
          if (column.isRequired != null && column.isRequired !== '') {
            colFields.push('is_required');
            colValues.push(this._escape(column.isRequired));
          }
          if (column.isInsert != null && column.isInsert !== '') {
            colFields.push('is_insert');
            colValues.push(this._escape(column.isInsert));
          }
          if (column.isEdit != null && column.isEdit !== '') {
            colFields.push('is_edit');
            colValues.push(this._escape(column.isEdit));
          }
          if (column.isList != null && column.isList !== '') {
            colFields.push('is_list');
            colValues.push(this._escape(column.isList));
          }
          if (column.isQuery != null && column.isQuery !== '') {
            colFields.push('is_query');
            colValues.push(this._escape(column.isQuery));
          }
          if (column.queryType != null && column.queryType !== '') {
            colFields.push('query_type');
            colValues.push(this._escape(column.queryType));
          }
          if (column.htmlType != null && column.htmlType !== '') {
            colFields.push('html_type');
            colValues.push(this._escape(column.htmlType));
          }
          if (column.dictType != null && column.dictType !== '') {
            colFields.push('dict_type');
            colValues.push(this._escape(column.dictType));
          }
          if (column.sort != null) {
            colFields.push('sort');
            colValues.push(this._escape(column.sort));
          }
          if (column.createBy != null && column.createBy !== '') {
            colFields.push('create_by');
            colValues.push(this._escape(column.createBy));
          }
          colFields.push('create_time');
          colValues.push('sysdate()');

          const insertColumnSql = `insert into gen_table_column (${colFields.join(', ')}) values(${colValues.join(', ')})`;
          await db.insert(insertColumnSql);
        }
      }

      // 删除不存在的列 — 对应 deleteGenTableColumns
      const delColumns = tableColumns.filter(col => !dbTableColumnNames.includes(col.columnName));
      if (delColumns.length > 0) {
        const delColumnIds = delColumns.map(col => this._escape(col.columnId)).join(', ');
        await db.del(`delete from gen_table_column where column_id in (${delColumnIds})`);
      }
      
      return 1;
    } catch (err) {
      ctx.logger.error('同步数据库失败:', err);
      throw new Error('同步失败：' + err.message);
    }
  }

  /**
   * 批量生成代码
   * @param {array} tableNames - 表名数组
   * @return {Buffer} 代码压缩包
   */
  async batchGenCode(tableNames) {
    const { ctx } = this;
    
    try {
      const archive = archiver('zip', {
        zlib: { level: 9 }
      });
      
      for (const tableName of tableNames) {
        // 查询表信息
        const table = await this.selectGenTableByName(tableName);
        if (!table) {
          continue;
        }
        
        // 设置主子表信息
        await this.setSubTable(table);
        
        // 设置主键列信息
        this.setPkColumn(table);
        
        // 生成代码
        const codeMap = await this.generatorCode(table);
        
        // 添加文件到压缩包
        for (const [fileName, content] of Object.entries(codeMap)) {
          archive.append(content, { name: fileName });
        }
      }
      
      // 完成压缩
      archive.finalize();
      
      // 转换为 Buffer
      const chunks = [];
      archive.on('data', chunk => chunks.push(chunk));
      
      return new Promise((resolve, reject) => {
        archive.on('end', () => {
          resolve(Buffer.concat(chunks));
        });
        archive.on('error', reject);
      });
    } catch (err) {
      ctx.logger.error('批量生成代码失败:', err);
      throw new Error('生成失败：' + err.message);
    }
  }

  /**
   * 生成代码
   * @param {object} table - 表信息
   * @return {object} 代码映射
   */
  async generatorCode(table) {
    const { app } = this;
    
    // 准备模板上下文
    const context = VelocityUtils.prepareContext(table);
    
    // 获取模板列表
    const templates = VelocityUtils.getTemplateList(table.tplCategory, table.tplWebType);
    
    const codeMap = {};
    
    // 渲染每个模板
    for (const template of templates) {
      const templatePath = path.join(app.baseDir, 'app/templates', template);
      
      if (await fs.pathExists(templatePath)) {
        const templateContent = await fs.readFile(templatePath, 'utf-8');
        let code = VelocityUtils.render(templateContent, context);
        // 移除多余的空行
        code = VelocityUtils.removeExtraBlankLines(code);
        const fileName = VelocityUtils.getFileName(template, table);
        codeMap[fileName] = code;
      }
    }
    
    return codeMap;
  }

  /**
   * 设置主键列信息
   * @param {object} table - 表信息
   */
  setPkColumn(table) {
    const { ctx } = this;
    
    // 确保 columns 是数组
    if (!table.columns) {
      ctx.logger.warn('表信息中缺少 columns 字段');
      table.columns = [];
    }
    
    if (!Array.isArray(table.columns)) {
      ctx.logger.error('表的 columns 不是数组类型:', typeof table.columns, table.columns);
      table.columns = [];
    }
    
    const columns = table.columns;
    
    for (const column of columns) {
      if (column.isPk === '1') {
        table.pkColumn = column;
        // 设置大写字段名
        column.capJavaField = GenUtils.capitalize(column.javaField);
        break;
      }
    }
    
    if (!table.pkColumn && columns.length > 0) {
      table.pkColumn = columns[0];
      table.pkColumn.capJavaField = GenUtils.capitalize(table.pkColumn.javaField);
    }
    
    // 处理子表
    if (table.tplCategory === GenConstants.TPL_SUB && table.subTable) {
      const subColumns = table.subTable.columns || [];
      for (const column of subColumns) {
        if (column.isPk === '1') {
          table.subTable.pkColumn = column;
          column.capJavaField = GenUtils.capitalize(column.javaField);
          break;
        }
      }
      
      if (!table.subTable.pkColumn && subColumns.length > 0) {
        table.subTable.pkColumn = subColumns[0];
        table.subTable.pkColumn.capJavaField = GenUtils.capitalize(table.subTable.pkColumn.javaField);
      }
    }
  }

  /**
   * 设置主子表信息
   * @param {object} table - 表信息
   */
  async setSubTable(table) {
    const subTableName = table.subTableName;
    if (subTableName) {
      table.subTable = await this.selectGenTableByName(subTableName);
    }
  }

  /**
   * 设置代码生成其他选项值
   * @param {object} genTable - 表信息
   */
  async setTableFromOptions(genTable) {
    const options = genTable.options;
    if (options) {
      try {
        const paramsObj = typeof options === 'string' ? JSON.parse(options) : options;
        
        genTable.treeCode = paramsObj[GenConstants.TREE_CODE];
        genTable.treeParentCode = paramsObj[GenConstants.TREE_PARENT_CODE];
        genTable.treeName = paramsObj[GenConstants.TREE_NAME];
        genTable.parentMenuId = paramsObj[GenConstants.PARENT_MENU_ID];
        genTable.parentMenuName = paramsObj[GenConstants.PARENT_MENU_NAME];
      } catch (e) {
        // 解析失败，忽略
      }
    }
  }

  /**
   * 获取代码生成地址
   * @param {object} table - 表信息
   * @param {string} fileName - 文件名
   * @return {string} 生成地址
   */
  getGenPath(table, fileName) {
    const { app } = this;
    const genPath = table.genPath || '/';
    
    if (genPath === '/') {
      return path.join(app.baseDir, fileName);
    }
    
    return path.join(genPath, fileName);
  }

  /**
   * 创建表结构
   * @param {string} sql - SQL 语句
   * @return {object} { success: boolean, tableNames: array, message: string }
   */
  async createTable(sql) {
    const { ctx } = this;
    
    try {
      // 1. 过滤 SQL 关键字
      SqlUtils.filterKeyword(sql);
      
      // 2. 分割 SQL 语句
      const statements = SqlUtils.splitStatements(sql);
      const tableNames = [];
      
      // 3. 执行每个 CREATE TABLE 语句
      const db = this._getDb();
      for (const statement of statements) {
        if (SqlUtils.isCreateTableStatement(statement)) {
          // 执行 SQL — 对应 createTable XML 中的 ${sql}
          await db.run(statement);

          // 提取表名
          const names = SqlUtils.parseCreateTableNames(statement);
          tableNames.push(...names);
        }
      }
      
      if (tableNames.length === 0) {
        throw new Error('未找到有效的 CREATE TABLE 语句');
      }
      
      // 4. 查询新创建的表信息
      const tableList = await this.selectDbTableListByNames(tableNames);
      
      // 5. 导入表结构
      const operName = ctx.state.user.userName || 'admin';
      await this.importGenTable(tableNames);
      
      return {
        success: true,
        tableNames,
        message: `成功创建 ${tableNames.length} 个表`
      };
    } catch (err) {
      ctx.logger.error('创建表结构失败:', err);
      throw new Error('创建表结构异常：' + err.message);
    }
  }
}

module.exports = GenService;

