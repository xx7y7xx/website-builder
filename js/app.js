"use strict";

var fs = require("fs");
var path = require("path");

$(function() {
  
  var DB_FILENAME = "db.json";
  
  $("#reload-project").click(function() {
    //load_project();
  });
  
  // Load last project path
  (function() {
    var project_dir = window.localStorage.getItem("project_dir") || "";
    $("#project-path").val(project_dir);
  })();
  var project_dir = $("#project-path").val();
  
//  // Save for next time using.
//  window.localStorage.setItem("project_dir", project_dir);
  
  //load_project();
  
  var model = new SubprojectListModel(project_dir, DB_FILENAME);
  model.load();
  
  var view = new SubprojectListView(model, {
    "list": $(".sub-project-list"),
    "reload-button": $("reload-project")
  });
  view.show();
});

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
  this._project_dir = project_dir;
  this._db_filename = db_filename;
  this._items = [];
  
  /**
   * JSON database store project information.
   * @property _db
   * @private
   */
  this._db = {};
  
  this._load_db();
}

SubprojectListModel.prototype = {
  /**
   * getItems
   * @method getItems
   */
  "getItems": function() {
    return [].concat(this._items);
  },
  
  /**
   * Read project dir and store all sub dir.
   * @method load
   */
  "load": function() {
    try {
      var stats = fs.statSync(this._project_dir);
    } catch(e) {
      alert("Dir not exist");
      console.log(e);
      return;
    }
    
    if (!stats.isDirectory()) {
      alert("not a dir");
      return;
    }
    
    // List files/dirs in current dir.
    var _this = this;
    $.each.call(this, fs.readdirSync(this._project_dir), function(key, path) {
      var abs_path = _this._project_dir + "/" + path;
      if (!fs.lstatSync(abs_path).isDirectory()) {
        console.log("Ignore path: " + path);
        return;
      }
      _this._items.push({
        "dir_name": path,
        "sub_project_name": _this._get_sub_project_name(path)
      });
    });
    
    return this._items;
  },
  
  /**
   * Load database when exists.
   * @method _load_db
   * @private
   */
  "_load_db": function() {
    var db_file = path.join(this._project_dir, this._db_filename);
    if (!fs.existsSync(db_file)) {
      console.log(DB_FILENAME + " not exist: " + db_file);
      return;
    } else {
      this._db = JSON.parse(fs.readFileSync(db_file, "utf8"));
    }
  },
  
  /**
   * Get project name from database
   */
  "_get_sub_project_name": function(path) {
    var ret = "";
    $.each(this._db.sub_projects, function(k, v) {
      if (v.dir_name == path) {
        ret = v.sub_project_name;
      }
    });
    return ret;
  }
};

/**
 * Sub projects list
 * @class SubprojectListView
 */
function SubprojectListView(model, elements) {
  this._model = model;
  this._elements = elements;
}

SubprojectListView.prototype = {
  /**
   * Show view
   * @method show
   */
  "show": function() {
    this.rebuildList();
  },
  
  /**
   * Rebuild sub project list
   * @method rebuildList
   */
  "rebuildList": function() {
    var list, items;
    
    // Clear list.
    list = this._elements.list;
    list.html("");
    
    items = this._model.getItems();
    $.each(items, function(key, value){
      $(".sub-project-list").append(
        '<h4>' + value.dir_name + '</h4>' +
        '<label>项目名称:</label> ' +
        '<input placeholder="请输入项目名称" value="' + value.sub_project_name + '" />'
      );
    });
  }
};