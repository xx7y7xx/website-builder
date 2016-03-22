/*jslint node: true, browser: true*/
/*global $, jQuery, alert, List*/

"use strict";

var fs = require("fs");
var path = require("path");

var DB_FILENAME = "db.json";

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
function SubProjectListModel(project_dir, db_filename) {
  /**
   * Project path
   * @property project_dir
   * @private
   */
  this.project_dir = project_dir;
  this.db_filename = db_filename;
  
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
  
  // Load all into this.items
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
   * getItems
   * @method getItems
   * @return {Array} this.items contains all sub project info
   */
  "getItems": function () {
    return [].concat(this.items);
  },
  
  /**
   * Read project dir and store all sub dir in items.
   * @method load
   * @private
   */
  "load_sub_projects": function () {
    var stats, self = this;
    try {
      stats = fs.statSync(this.project_dir);
    } catch (e) {
      alert("Dir not exist");
      console.log(e);
      return;
    }
    
    if (!stats.isDirectory()) {
      alert("not a dir");
      return;
    }
    
    // List files/dirs in current dir.
    
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
      console.log("db not exist: " + path);
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
    var dbFile = path.join(this.project_dir, dirName, this.db_filename),
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
    var dbFile = path.join(this.project_dir, dirName, this.db_filename),
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
  
  var that = this;
  
  this.elements["reload-button"].click(function () {
    that.rebuildList();
  });
  
  this.elements["sub-project-list"].on("click", ".save-button", function () {
    that.saveButtonClicked.notify({
      "sub-project": $(this).parent().parent()
    });
    alert("保存成功！");
  });
}

SubProjectListView.prototype = {
  /**
   * Show view
   * @method show
   */
  "show": function () {
    this.rebuildList();
  },
  
  /**
   * Rebuild sub project list
   * @method rebuildList
   */
  "rebuildList": function () {
    console.log("Reload data from model.");
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
    console.log("event sender: " + sender);
    var subProjectElement = args["sub-project"],
      name,
      dirName;
    
    name = subProjectElement.find("input").val();
    dirName = subProjectElement.find(".dir_name").html();
    
    console.log("Get user input project name: " + name);
    console.log("Get dir name stored in html5 data property: " + dirName);
    
    self.setSubProjectInfo(dirName, name);
  });
}

SubProjectListController.prototype = {
  "setSubProjectInfo": function (dirName, name) {
    this.model.setSubProjectInfo(dirName, name);
  }
};

$(function () {
  
  var project_dir,
    model,
    view,
    controller;
  
  $("#reload-project").click(function () {
    //load_project();
  });
  
  // Load last project path
  (function () {
    var project_dir = window.localStorage.getItem("project_dir") || "";
    $("#project-path").val(project_dir);
  }());
  project_dir = $("#project-path").val();
  
//  // Save for next time using.
//  window.localStorage.setItem("project_dir", project_dir);
  
  //load_project();
  
  model = new SubProjectListModel(project_dir, DB_FILENAME);
  view = new SubProjectListView(model, {
    "list": $(".sub-project-list"),
    "reload-button": $("#reload-project"),
    "sub-project-list": $(".sub-project-list")
  });
  controller = new SubProjectListController(model, view);
  view.show();
});