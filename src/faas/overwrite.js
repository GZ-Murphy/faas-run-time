// "Faas runtime is modified based on nswbmw/kless."

const path = require('path')
const assert = require('assert')
const Koa = require('koa')
const compose = require('koa-compose')
const objectPath = require('object-path')
const requireDirectory = require('require-directory')
const fs = require('fs')
const CONFIG = require('../config')

const http = require('http');

const fileTypes = ['controller', 'service', 'route']


module.exports = class FaasRunTime extends Koa {
  constructor() {
    super()
    this.baseInfo = objectPath({
      verson: null,
      modifyDate: null,
      path: null
    });
  }

  callback() {
    if (!this.listenerCount('error')) this.on('error', this.onerror);
    const handleRequest = async (req, res) => {
      const ctx = this.createContext(req, res);
      const curVersion = ctx.headers['faas-version'];
      if (curVersion !== this.baseInfo.get('verson')) {
        let filesExist = true;
        await getFiles(curVersion)
          .catch((err) => filesExist = false);
        if (filesExist) {
          await syncFunction();
          this.baseInfo.set('verson', curVersion);
          this.baseInfo.set('modifyDate', new Date());
          this.baseInfo.set('path', 'http:/' + CONFIG.FAAS.host + '/' + CONFIG.FAAS.port + '/assets/faas/' + curVersion + '/**/index.js');
        }
      }

      const fn = compose(this.middleware);
      this.handleRequest(ctx, fn);
    };
    return handleRequest;
  }

  route(routeName, obj) {
    assert(typeof routeName === 'string', 'routeName required')
    assert(typeof obj === 'object', 'route option should be an object')
    assert(typeof obj.method === 'string', 'route `method` required')
    assert(typeof obj.controller === 'function' || (Array.isArray(obj.controller) && obj.controller.every(ctr => typeof ctr === 'function')), 'route `controller` should be a function or an array of functions')

    const controllerFnArr = Array.isArray(obj.controller) ? obj.controller : [obj.controller]

    this.use((ctx, next) => {
      const fnObj = objectPath.get(this.route, ctx.path.slice(1) || 'index');
      const fn = fnObj[ctx.method];
      if (fn && typeof fn === 'function') {
        return fn(ctx, next)
      }
      return next()
    })

    let faasObj;
    if (objectPath.has(this.route, routeName)) {
      faasObj = objectPath.get(this.route, routeName)
    } else {
      faasObj = {}
    }
    faasObj[obj.method.toLocaleUpperCase()] = compose(controllerFnArr)
    objectPath.set(this.route, routeName, faasObj)
  }

  controller(name, obj) {
    assert(name && typeof name === 'string', 'controller `name` required')
    assert(obj && (['object', 'function'].includes(typeof obj)), 'controller second parameter should be a function or an object')

    objectPath.set(this.controller, name, obj)
  }

  service(name, obj) {
    assert(name && typeof name === 'string', 'service `name` required')
    assert(obj && (['object', 'function'].includes(typeof obj)), 'service second parameter should be a function or an object')

    if (typeof obj === 'object') {
      // bind
      for (let key in obj) {
        /* istanbul ignore else */
        if (typeof obj[key] === 'function') {
          obj[key] = obj[key].bind(obj)
        }
      }
    }

    objectPath.set(this.service, name, obj)
  }
}


async function getFileFormWebsite(filename, version) {
  let fileChunk = '';
  const options = {
    host: CONFIG.FAAS.host,
    port: CONFIG.FAAS.port,
    path: '/assets/faas/' + version + '/' + filename + '/index.js'
  };
  return new Promise((resolve, reject) => {
    http.get(options, function (resp) {
      resp.on('data', function (chunk) {

        fileChunk += chunk
      });
      resp.on('end', function (chunk) {
        if (fileChunk.includes('<!DOCTYPE html>')) {
          return reject()
        }
        else fs.writeFile(__dirname + '/../_functions/' + filename + '/index.js', fileChunk, function (err) {
          if (err) {
            reject()
          }
          else resolve()
        });
      });
    }).on("error", function (e) {
      console.log("Got error: " + e.message);
      reject()
    });
  })

}

function load(dir) {
  return new Promise((resolve) => {
    if (path.isAbsolute(dir)) {
      requireDirectory(module,
        dir,
        { visit: () => resolve() }
      )
    } else {
      requireDirectory(module,
        path.join(path.dirname(module.parent.filename), dir),
        { visit: () => resolve() }
      )
    }
  })
}


async function getFiles(curVersion) {
  let promiseList = []
  fileTypes.forEach(name =>
    promiseList.push(getFileFormWebsite(name, curVersion))
  )
  return new Promise((resolve, reject) =>
    Promise.all(promiseList).then(
      res => resolve(res),
      err => reject(err),
    ))

}

async function syncFunction() {
  let promiseList = []
  fileTypes.forEach(name => {
    cleanCache(require.resolve('../_functions/' + name));
    promiseList.push(load('_functions/' + name))
  })

  return new Promise((resolve,reject) => Promise.all(promiseList).then(
    res => resolve(),
    err => reject(err)
    ))
}

function cleanCache(modulePath) {
  var module = require.cache[modulePath];
  // remove reference in module.parent  
  if (module && module.parent) {
    module.parent.children.splice(module.parent.children.indexOf(module), 1);
  }
  require.cache[modulePath] = null;
}