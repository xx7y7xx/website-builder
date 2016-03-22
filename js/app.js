/*jslint node: true, browser: true*/
/*global $, jQuery, alert, List*/

"use strict";

var fs = require("fs");
var path = require("path");

var DB_FILENAME = "db.json";

// HTML5 storage key name
var PROJ_ROOT_PATH = "project_dir";

/**
 * event
 * @class Event
 */
function Event(sender) {
  /**
   * Who (whick view) send this event.
   */
  this.sender = sender;
  this.listeners = [];
}

Event.prototype = {
  "attach": function (listener) {
    this.listeners.push(listener);
  },
  "notify": function (args) {
    var index;
    for (index = 0; index < this.listeners.length; index += 1) {
      this.listeners[index](this.sender, args);
    }
  }
};

/**
 * SubProjectListModel
 * @class SubProjectListModel
 */
function SubProjectListModel() {

  /**
   * Project path
   * @property project_dir
   * @private
   */
  this.project_dir = "";
  
  /**
   * All sub project info in one big array.
   * ```json
   * [{
   *   "dir_name": "foo",
   *   "sub_project_name": "bar"
   * }, {
   *   "dir_name": "foo",
   *   "sub_project_name": "bar"
   * }]
   * ```
   * @property items
   * @private
   */
  this.items = [];
  
  this.load_saved_data();
  
  // Build model data.
  this.load_sub_projects();
  
  // Prepare for search data.
  var options = {
    valueNames: [
      'dir_name',
      {attr: 'value', name: 'sub_project_name'}
    ],
    item: '<li>' +
          '<h4 class="dir_name"></h4>' +
          '<div class="subproject">' +
          '<label>项目名称:</label> ' +
          '<input class="sub_project_name" placeholder="请输入项目名称" /> ' +
          '<button class="save-button">保存</button>' +
          '</div>' +
          '</li>'
  },
    userList = new List('sub-project-list', options, this.items);
}

SubProjectListModel.prototype = {
  /**
   * Load data from HTML5 storage.
   * @method load_saved_data
   * @private
   */
  "load_saved_data": function () {
    // Load root path last time saved.
    this.project_dir = window.localStorage.getItem(PROJ_ROOT_PATH) || "";
  },
  
  /**
   * getItems
   * @method getItems
   * @return {Array} this.items contains all sub project info
   */
  "getItems": function () {
    return [].concat(this.items);
  },
  
  /**
   * Set project root path
   * @method setProjectDir
   * @param {String} path
   */
  "setProjectDir": function (path) {
    this.project_dir = path;
    
    window.localStorage.setItem(PROJ_ROOT_PATH, path);
  },
  
  /**
   * Get project root path
   * @method getProjectDir
   * @return {String} root path of project.
   */
  "getProjectDir": function () {
    return this.project_dir;
  },
    
  /**
   * Read project dir and store all sub dir in items.
   * @method load
   */
  "load_sub_projects": function () {
    var stats, self = this;
    try {
      stats = fs.statSync(this.project_dir);
    } catch (e) {
      console.error("[Model] Dir not exist");
      console.error(e);
      return;
    }
    
    if (!stats.isDirectory()) {
      console.error("[Model] not a dir");
      return;
    }
    
    // List files/dirs in current dir.
    self.items = [];
    $.each.call(this, fs.readdirSync(this.project_dir), function (key, path) {
      var abs_path = self.project_dir + "/" + path;
      if (!fs.lstatSync(abs_path).isDirectory()) {
        console.log("Ignore path: " + path);
        return;
      }
      self.items.push({
        "dir_name": path,
        "sub_project_name": self.getSubProjectInfo(path).name
      });
    });
    
    return this.items;
  },
  
  /**
   * Load database when exists.
   * @method load_db
   * @param {String} path to json(db) file.
   * @return {Object|null} When json not exist or parsed error, return null
   *         When json exists, return parsed json object.
   * @private
   */
  "load_db": function (path) {
    if (!fs.existsSync(path)) {
      console.log("[Model] db not exist: " + path);
      return null;
    } else {
      try {
        return JSON.parse(fs.readFileSync(path, "utf8"));
      } catch (e) {
        return null;
      }
    }
  },
  
  /**
   * Get sub project info from database in selected sub project dir.
   *
   * All sub project info is stored in a JSON file under every dir.
   * 
   * @method getSubProjectInfo
   * @return {Object} sub project info with name
   * {
   *   "name": "sub project name"
   * }
   */
  "getSubProjectInfo": function (dirName) {
    var dbFile = path.join(this.project_dir, dirName, DB_FILENAME),
      fileObj,
      proj_info = {
        "name": ""
      };
    
    fileObj = this.load_db(dbFile);
    if (fileObj) {
      proj_info.name = fileObj.name || "";
    }
    return proj_info;
  },
  
  /**
   * Save project name to database.
   * @method setSubProjectName
   */
  "setSubProjectInfo": function (dirName, name) {
    var dbFile = path.join(this.project_dir, dirName, DB_FILENAME),
      txt = "";
    
    console.log("Save project info.");
    console.log("dir name: " + dirName);
    console.log("project name: " + name);
    
    txt = JSON.stringify({
      "name": name
    }, null, 2);
    fs.writeFileSync(dbFile, txt, 'utf8');
  }
};

/**
 * Sub projects list
 * @class SubProjectListView
 */
function SubProjectListView(model, elements) {
  this.model = model;
  this.elements = elements;
  
  this.reloadButtonClicked = new Event(this);
  this.saveButtonClicked = new Event(this);
  
  var self = this;
  
  this.elements["reload-button"].click(function () {
    self.reloadButtonClicked.notify({
      "project_root_path": $("#project-path").val()
    });
  });
  
  this.elements["sub-project-list"].on("click", ".save-button", function () {
    self.saveButtonClicked.notify({
      "sub-project": $(this).parent().parent()
    });
    alert("保存成功！");
  });
}

SubProjectListView.prototype = {
  /**
   * Show view, only the first time.
   * @method show
   */
  "show": function () {
    var projectDir = this.model.getProjectDir();
    if (projectDir === "") {
      return;
    }
    this.rebuildList();
    $("#project-path").val(this.model.getProjectDir());
  },
  
  /**
   * Rebuild sub project list
   * @method rebuildList
   */
  "rebuildList": function () {
    console.log("[View] Reload data from model.");
    var list, items;
    
    // Clear list.
    list = this.elements.list;
    list.html("");
    
    items = this.model.getItems();
    $.each(items, function (key, value) {
      $(".sub-project-list").append(
        '<li>' +
          '<h4 class="dir_name">' + value.dir_name + '</h4>' +
          '<div class="subproject">' +
          '  <label>项目名称:</label> ' +
          '  <input class="sub_project_name" placeholder="请输入项目名称" value="' + value.sub_project_name + '" /> ' +
          '  <button class="save-button">保存</button>' +
          '</div>' +
          '</li>'
      );
    });
  }
};

/**
 * SubProjectListController
 * @class SubProjectListController
 */
function SubProjectListController(model, view) {
  this.model = model;
  this.view = view;
  
  var self = this;
  this.view.saveButtonClicked.attach(function (sender, args) {
    console.log("[Controller] event sender: " + sender);
    var subProjectElement = args["sub-project"],
      name,
      dirName;
    
    name = subProjectElement.find("input").val();
    dirName = subProjectElement.find(".dir_name").html();
    
    console.log("[Controller] Get user input project name: " + name);
    console.log("[Controller] Get dir name stored in html5 data property: " + dirName);
    
    self.setSubProjectInfo(dirName, name);
  });
  
  this.view.reloadButtonClicked.attach(function (sender, args) {
    console.log("[Controller] event sender: " + sender);
    
    if (args.project_root_path === "") {
      return;
    }
    
    self.model.setProjectDir(args.project_root_path);
    self.model.load_sub_projects();
    
    self.view.rebuildList();
  });
}

SubProjectListController.prototype = {
  "setSubProjectInfo": function (dirName, name) {
    this.model.setSubProjectInfo(dirName, name);
  }
};

$(function () {
  
  var model,
    view,
    controller;
    
  model = new SubProjectListModel();
  view = new SubProjectListView(model, {
    "list": $(".sub-project-list"),
    "reload-button": $("#reload-project"),
    "sub-project-list": $(".sub-project-list")
  });
  controller = new SubProjectListController(model, view);
  view.show();
});