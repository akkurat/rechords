import { Mongo } from "meteor/mongo";

var showdown = require("showdown");
var rmd = require("showdown-rechords");
var DOMParser = require("xmldom").DOMParser;
var Parser = require("html-react-parser");
var slug = require("slug");
var xss = require("xss");

var options = {
  whiteList: {
    a: ["href", "title"],
    span: ["class"],
    i: [],
    h1: [],
    h2: [],
    h3: [],
    ul: ["class"],
    li: [],
    p: [],
    br: [],
    strong: [],
    em: []
  }
};

const converter = new showdown.Converter({ extensions: [rmd] });

showdown.setOption("simpleLineBreaks", true);
showdown.setOption("smoothLivePreview", true);
showdown.setOption("simplifiedAutoLink", true);
showdown.setOption("openLinksInNewWindow", true);

export class Song {
  _id?: string;

  text: string;

  title: string;
  author: string;

  tags?: Array<string>;
  chords?: Array<string>;
  html?: string;

  title_: string;
  author_:string;

  getHtml() {
    if (!("html" in this)) {
      this.parse(this.text);
    }
    return this.html;
  }

  getChords() {
    if (!("chords" in this)) {
      this.parse(this.text);
    }
    return this.chords;
  }

  getTags() {
    if (!("tags" in this)) {
      this.parse(this.text);
    }
    return this.tags;
  }

  getVirtualDom() {
    return Parser(this.html);
  }

  parse(md) {
    this.text = md;

    // Create HTML
    // only member that exist in the mongo db are published
    // to the outside.
    this.html = xss(converter.makeHtml(this.text), options);
    this.title = "";
    this.author = "";

    this.tags = [];
    this.chords = [];

    // URL-compatible strings
    this.title_ = "";
    this.author_ = "";

    // this._id may be present or not, but is, most importantly: unaffected!

    // Set Metadata
    let dom = new DOMParser().parseFromString(this.html, "text/html");

    if (dom === undefined) {
      // Delete song
      return;
    }

    let h1 = dom.getElementsByTagName("h1");
    if (h1.length > 0) {
      this.title = h1[0].textContent;
      this.title_ = slug(this.title);
    }

    let h2 = dom.getElementsByTagName("h2");
    if (h2.length > 0) {
      this.author = h2[0].textContent;
      this.author_ = slug(this.author);
    }

    this.tags = RmdHelpers.collectTags(dom);
    this.chords = RmdHelpers.collectChords(dom);
  }

  getRevisions() {
    return Revisions.find({
      of: this._id
    }, { 
      sort: {timestamp: -1} 
    });
  }

  getRevision(steps: number) {
    return this.getRevisions().fetch()[steps]
  }
}

export class Revision {
  text: string;
  of: string;

  ip: string;
  timestamp: Date;
}


let Revisions = new Mongo.Collection<Revision>('revisions');
Revisions.setClass(Revision);
let Songs = new Mongo.Collection<Song>('songs');
Songs.setClass(Song);


export class RmdHelpers {
  static collectTags(dom) {
    let tags = [];
    let uls = dom.getElementsByTagName("ul");
    for (let i = 0; i < uls.length; i++) {
      let ul = uls[i];
      if (ul.getAttribute("class") != "tags") continue;

      let lis = ul.getElementsByTagName("li");
      for (let j = 0; j < lis.length; j++) {
        let li = lis[j];
        tags.push(li.textContent);
      }
    }
    return tags;
  }
  static collectChords(dom) {
    return this.collectChordsDom(dom).map(c => c.textContent);
  }
  static collectChordsDom(dom) {
    let chords = [];

    let uls = dom.getElementsByTagName("span");
    for (let i = 0; i < uls.length; i++) {
      let chord_dom = uls[i];
      if (chord_dom.getAttribute("class") == "chord") {
        chords.push(chord_dom);
      }
    }
    //console.log(chords);
    // console.log(ChrodLib.guessKey(this.chords));
    return chords;
  }
}

export { Revisions };

export default Songs;