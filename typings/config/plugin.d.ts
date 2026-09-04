// This file is created by egg-ts-helper@1.35.2
// Do not modify this file!!!!!!!!!
/* eslint-disable */

import 'egg';
import 'egg-onerror';
import 'egg-session';
import 'egg-i18n';
import 'egg-watcher';
import 'egg-multipart';
import 'egg-security';
import 'egg-development';
import 'egg-logrotator';
import 'egg-schedule';
import 'egg-static';
import 'egg-jsonp';
import 'egg-view';
import 'ruoyi-eggjs-cache';
import 'egg-cors';
import 'egg-decorator-router';
import 'egg-jwt';
import 'egg-mongoose';
import 'ruoyi-eggjs-ratelimiter';
import '@hackycy/egg-bull';
import { EggPluginItem } from 'egg';
declare module 'egg' {
  interface EggPlugin {
    onerror?: EggPluginItem;
    session?: EggPluginItem;
    i18n?: EggPluginItem;
    watcher?: EggPluginItem;
    multipart?: EggPluginItem;
    security?: EggPluginItem;
    development?: EggPluginItem;
    logrotator?: EggPluginItem;
    schedule?: EggPluginItem;
    static?: EggPluginItem;
    jsonp?: EggPluginItem;
    view?: EggPluginItem;
    cache?: EggPluginItem;
    cors?: EggPluginItem;
    decoratorRouter?: EggPluginItem;
    jwt?: EggPluginItem;
    mongoose?: EggPluginItem;
    ratelimiter?: EggPluginItem;
    bull?: EggPluginItem;
  }
}