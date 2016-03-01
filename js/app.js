/*jslint node: true, browser: true*/
/*global $, jQuery, alert*/

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
 * SubprojectListModel
 * @class SubprojectListModel
 */
function SubprojectListModel(project_dir, db_filename) {
  /**
   * _project_dir
   * @property _project_dir
   * @private
   */
  this.project_dir = project_dir;
  this.db_filename = db_filename;
  this.items = [];
  
  /**
   * JSON database store project information.
   * @property _db
   * @private
   */
  this.db = {};
  
  this.load_db();
  this.load_fs();
}

SubprojectListModel.prototype = {
  /**
   * getItems
   * @method getItems
   */
  "getItems": function () {
    return [].concat(this.items);
  },
  
  /**
   * Read project dir and store all sub dir.
   * @method load
   */
  "load_fs": function () {
    var stats, that = this;
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
      var abs_path = that.project_dir + "/" + path;
      if (!fs.lstatSync(abs_path).isDirectory()) {
        console.log("Ignore path: " + path);
        return;
      }
      that.items.push({
        "dir_name": path,
        "sub_project_name": that.getSubProjectName(path)
      });
    });
    
    return this.items;
  },
  
  /**
   * Load database when exists.
   * @method _load_db
   * @private
   */
  "load_db": function () {
    var db_file = path.join(this.project_dir, this.db_filename);
    if (!fs.existsSync(db_file)) {
      console.log(DB_FILENAME + " not exist: " + db_file);
      return;
    } else {
      this.db = JSON.parse(fs.readFileSync(db_file, "utf8"));
    }
  },
  
  /**
   * Get project name from database in selected sub project dir
   * @method getSubProjectName
   * @return {String} sub project name
   */
  "getSubProjectName": function (dirName) {
    var dbFile = path.join(this.project_dir, dirName, this.db_filename),
      name = "",
      fileObj;
    
    if (!fs.existsSync(dbFile)) {
      console.log(DB_FILENAME + " not exist: " + dbFile);
    } else {
      fileObj = JSON.parse(fs.readFileSync(dbFile, "utf8"));
      name = fileObj.name;
    }
    
    return name;
  },
  
  /**
   * Save project name to database.
   * @method setSubProjectName
   */
  "setSubProjectInfo": function (dirName, name) {
    var dbFile = path.join(this.project_dir, dirName, this.db_filename),
      txt = "";
    
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
 * @class SubprojectListView
 */
function SubprojectListView(model, elements) {
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
      "sub-project": $(this).parent()
    });
  });
}

SubprojectListView.prototype = {
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
        '<h4>' + value.dir_name + '</h4>' +
          '<div class="subproject" data-dir-name="' + value.dir_name + '">' +
          '<label>项目名称:</label> ' +
          '<input placeholder="请输入项目名称" value="' + value.sub_project_name + '" /> ' +
          '<button class="save-button">保存</button>' +
          '</div>'
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
  
  var that = this;
  this.view.saveButtonClicked.attach(function (sender, args) {
    console.log("event sender: " + sender);
    var subProjectElement = args["sub-project"],
      name,
      dirName;
    
    name = subProjectElement.find("input").val();
    dirName = subProjectElement.data("dir-name");
    
    console.log("Get user input project name: " + name);
    console.log("Get dir name stored in html5 data property: " + dirName);
    
    that.setSubProjectInfo(dirName, name);
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
  
  model = new SubprojectListModel(project_dir, DB_FILENAME);
  view = new SubprojectListView(model, {
    "list": $(".sub-project-list"),
    "reload-button": $("#reload-project"),
    "sub-project-list": $(".sub-project-list")
  });
  controller = new SubProjectListController(model, view);
  view.show();
});