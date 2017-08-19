/**
    @external BaseClass
    @see https://github.com/d3plus/d3plus-common#BaseClass
*/

import {select} from "d3-selection";
import {transition} from "d3-transition";
import {max, min, sum} from "d3-array";

import {accessor, BaseClass, constant} from "d3plus-common";
import textSplit from "./textSplit";
import measure from "./textWidth";
import wrap from "./textWrap";
import {trimRight} from "./trim";

/**
    @class TextBox
    @extends external:BaseClass
    @desc Creates a wrapped text box for each point in an array of data. See [this example](https://d3plus.org/examples/d3plus-text/getting-started/) for help getting started using the TextBox class.
*/
export default class TextBox extends BaseClass {

  /**
      @memberof TextBox
      @desc Invoked when creating a new class instance, and sets any default parameters.
      @private
  */
  constructor() {

    super();

    this._delay = 0;
    this._duration = 0;
    this._ellipsis = _ => `${_.replace(/\.|,$/g, "")}...`;
    this._fontColor = constant("black");
    this._fontFamily = constant("Verdana");
    this._fontMax = constant(50);
    this._fontMin = constant(8);
    this._fontResize = constant(false);
    this._fontSize = constant(10);
    this._fontWeight = constant(400);
    this._height = accessor("height", 200);
    this._id = (d, i) => d.id || `${i}`;
    this._on = {};
    this._overflow = constant(false);
    this._pointerEvents = constant("auto");
    this._rotate = constant(0);
    this._split = textSplit;
    this._text = accessor("text");
    this._textAnchor = constant("start");
    this._verticalAlign = constant("top");
    this._width = accessor("width", 200);
    this._x = accessor("x", 0);
    this._y = accessor("y", 0);

  }

  /**
      @memberof TextBox
      @desc Renders the text boxes. If a *callback* is specified, it will be called once the shapes are done drawing.
      @param {Function} [*callback* = undefined]
  */
  render(callback) {

    if (this._select === void 0) this.select(select("body").append("svg").style("width", `${window.innerWidth}px`).style("height", `${window.innerHeight}px`).node());
    if (this._lineHeight === void 0) this._lineHeight = (d, i) => this._fontSize(d, i) * 1.4;
    const that = this;

    const boxes = this._select.selectAll(".d3plus-textBox").data(this._data.reduce((arr, d, i) => {

      const t = this._text(d, i);
      if (t === void 0) return arr;

      const resize = this._fontResize(d, i);

      let fS = resize ? this._fontMax(d, i) : this._fontSize(d, i),
          lH = resize ? fS * 1.4 : this._lineHeight(d, i),
          line = 1,
          lineData = [],
          sizes;

      const style = {
        "font-family": this._fontFamily(d, i),
        "font-size": fS,
        "font-weight": this._fontWeight(d, i),
        "line-height": lH
      };

      const h = this._height(d, i),
            w = this._width(d, i);

      const wrapper = wrap()
        .fontFamily(style["font-family"])
        .fontSize(fS)
        .fontWeight(style["font-weight"])
        .lineHeight(lH)
        .height(h)
        .overflow(this._overflow(d, i))
        .width(w);

      const fMax = this._fontMax(d, i),
            fMin = this._fontMin(d, i),
            vA = this._verticalAlign(d, i),
            words = this._split(t, i);

      /**
          Figures out the lineData to be used for wrapping.
          @private
      */
      function checkSize() {

        if (fS < fMin) {
          lineData = [];
          return;
        }
        else if (fS > fMax) fS = fMax;

        if (resize) {
          lH = fS * 1.4;
          wrapper
            .fontSize(fS)
            .lineHeight(lH);
          style["font-size"] = fS;
          style["line-height"] = lH;
        }

        const wrapResults = wrapper(t);
        lineData = wrapResults.lines.filter(l => l !== "");
        line = lineData.length;

        if (wrapResults.truncated) {

          if (resize) {
            fS--;
            if (fS < fMin) lineData = [];
            else checkSize();
          }
          else if (line < 1) lineData = [that._ellipsis("")];
          else lineData[line - 1] = that._ellipsis(lineData[line - 1]);

        }


      }

      if (w > fMin && (h > lH || resize && h > fMin * 1.4)) {

        if (resize) {

          sizes = measure(words, style);

          const areaMod = 1.165 + w / h * 0.1,
                boxArea = w * h,
                maxWidth = max(sizes),
                textArea = sum(sizes, d => d * lH) * areaMod;

          if (maxWidth > w || textArea > boxArea) {
            const areaRatio = Math.sqrt(boxArea / textArea),
                  widthRatio = w / maxWidth;
            const sizeRatio = min([areaRatio, widthRatio]);
            fS = Math.floor(fS * sizeRatio);
          }

          const heightMax = Math.floor(h * 0.8);
          if (fS > heightMax) fS = heightMax;

        }

        checkSize();

      }

      if (lineData.length) {

        const tH = line * lH;
        let yP = vA === "top" ? 0 : vA === "middle" ? h / 2 - tH / 2 : h - tH;
        yP -= lH * 0.1;

        arr.push({
          data: d,
          i,
          lines: lineData,
          fC: this._fontColor(d, i),
          fF: style["font-family"],
          fW: style["font-weight"],
          id: this._id(d, i),
          tA: this._textAnchor(d, i),
          fS, lH, w, x: this._x(d, i), y: this._y(d, i) + yP
        });

      }

      return arr;

    }, []), this._id);

    const t = transition().duration(this._duration);

    if (this._duration === 0) {

      boxes.exit().remove();

    }
    else {

      boxes.exit().transition().delay(this._duration).remove();

      boxes.exit().selectAll("tspan").transition(t)
        .attr("opacity", 0);

    }

    function rotate(text) {
      text.attr("transform", (d, i) => `rotate(${that._rotate(d, i)} ${d.x + d.w / 2} ${d.y + d.lH / 4 + d.lH * d.lines.length / 2})`);
    }

    const update = boxes.enter().append("text")
        .attr("class", "d3plus-textBox")
        .attr("id", d => `d3plus-textBox-${d.id}`)
        .attr("y", d => `${d.y}px`)
        .call(rotate)
      .merge(boxes);

    update
      .attr("fill", d => d.fC)
      .attr("text-anchor", d => d.tA)
      .attr("font-family", d => d.fF)
      .style("font-family", d => d.fF)
      .attr("font-size", d => `${d.fS}px`)
      .style("font-size", d => `${d.fS}px`)
      .attr("font-weight", d => d.fW)
      .style("font-weight", d => d.fW)
      .style("pointer-events", d => this._pointerEvents(d.data, d.i))
      .each(function(d) {

        const dx = d.tA === "start" ? 0 : d.tA === "end" ? d.w : d.w / 2,
              tB = select(this);

        if (that._duration === 0) tB.attr("y", d => `${d.y}px`);
        else tB.transition(t).attr("y", d => `${d.y}px`);

        /**
            Styles to apply to each <tspan> element.
            @private
        */
        function tspanStyle(tspan) {
          tspan
            .text(t => trimRight(t))
            .attr("x", `${d.x}px`)
            .attr("dx", `${dx}px`)
            .attr("dy", `${d.lH}px`);
        }

        const tspans = tB.selectAll("tspan").data(d.lines);

        if (that._duration === 0) {

          tspans.call(tspanStyle);

          tspans.exit().remove();

          tspans.enter().append("tspan")
            .attr("dominant-baseline", "alphabetic")
            .style("baseline-shift", "0%")
            .call(tspanStyle);

        }
        else {

          tspans.transition(t).call(tspanStyle);

          tspans.exit().transition(t)
            .attr("opacity", 0).remove();

          tspans.enter().append("tspan")
              .attr("dominant-baseline", "alphabetic")
              .style("baseline-shift", "0%")
              .attr("opacity", 0)
              .call(tspanStyle)
            .merge(tspans).transition(t).delay(that._delay)
              .call(tspanStyle)
              .attr("opacity", 1);

        }

      })
      .transition(t).call(rotate);

    const events = Object.keys(this._on),
          on = events.reduce((obj, e) => {
            obj[e] = (d, i) => this._on[e](d.data, i);
            return obj;
          }, {});
    for (let e = 0; e < events.length; e++) update.on(events[e], on[events[e]]);

    if (callback) setTimeout(callback, this._duration + 100);

    return this;

  }

  /**
      @memberof TextBox
      @desc Sets the data array to the specified array. A text box will be drawn for each object in the array.
      @param {Array} [*data* = []]
  */
  data(_) {
    return arguments.length ? (this._data = _, this) : this._data;
  }

  /**
      @memberof TextBox
      @desc Sets the animation delay to the specified number in milliseconds.
      @param {Number} [*value* = 0]
  */
  delay(_) {
    return arguments.length ? (this._delay = _, this) : this._delay;
  }

  /**
      @memberof TextBox
      @desc Sets the animation duration to the specified number in milliseconds.
      @param {Number} [*value* = 0]
  */
  duration(_) {
    return arguments.length ? (this._duration = _, this) : this._duration;
  }

  /**
      @memberof TextBox
      @desc Sets the ellipsis method to the specified function or string, which simply adds an ellipsis to the string by default.
      @param {Function|String} [*value*]
      @example <caption>default accessor</caption>
function(d) {
  return d + "...";
}
  */
  ellipsis(_) {
    return arguments.length ? (this._ellipsis = typeof _ === "function" ? _ : constant(_), this) : this._ellipsis;
  }

  /**
      @memberof TextBox
      @desc Sets the font color to the specified accessor function or static string, which is inferred from the [DOM selection](#textBox.select) by default.
      @param {Function|String} [*value* = "black"]
  */
  fontColor(_) {
    return arguments.length ? (this._fontColor = typeof _ === "function" ? _ : constant(_), this) : this._fontColor;
  }

  /**
      @memberof TextBox
      @desc Sets the font family to the specified accessor function or static string, which is inferred from the [DOM selection](#textBox.select) by default.
      @param {Function|String} [*value* = "Verdana"]
  */
  fontFamily(_) {
    return arguments.length ? (this._fontFamily = typeof _ === "function" ? _ : constant(_), this) : this._fontFamily;
  }

  /**
      @memberof TextBox
      @desc Sets the maximum font size to the specified accessor function or static number, which is used when [dynamically resizing fonts](#textBox.fontResize).
      @param {Function|Number} [*value* = 50]
  */
  fontMax(_) {
    return arguments.length ? (this._fontMax = typeof _ === "function" ? _ : constant(_), this) : this._fontMax;
  }

  /**
      @memberof TextBox
      @desc Sets the minimum font size to the specified accessor function or static number, which is used when [dynamically resizing fonts](#textBox.fontResize).
      @param {Function|Number} [*value* = 8]
  */
  fontMin(_) {
    return arguments.length ? (this._fontMin = typeof _ === "function" ? _ : constant(_), this) : this._fontMin;
  }

  /**
      @memberof TextBox
      @desc Toggles font resizing, which can either be defined as a static boolean for all data points, or an accessor function that returns a boolean. See [this example](http://d3plus.org/examples/d3plus-text/resizing-text/) for a side-by-side comparison.
      @param {Function|Boolean} [*value* = false]
  */
  fontResize(_) {
    return arguments.length ? (this._fontResize = typeof _ === "function" ? _ : constant(_), this) : this._fontResize;
  }

  /**
      @memberof TextBox
      @desc Sets the font size to the specified accessor function or static number, which is inferred from the [DOM selection](#textBox.select) by default.
      @param {Function|Number} [*value* = 10]
  */
  fontSize(_) {
    return arguments.length ? (this._fontSize = typeof _ === "function" ? _ : constant(_), this) : this._fontSize;
  }

  /**
      @memberof TextBox
      @desc Sets the font weight to the specified accessor function or static number, which is inferred from the [DOM selection](#textBox.select) by default.
      @param {Function|Number|String} [*value* = 400]
  */
  fontWeight(_) {
    return arguments.length ? (this._fontWeight = typeof _ === "function" ? _ : constant(_), this) : this._fontWeight;
  }

  /**
      @memberof TextBox
      @desc Sets the height for each box to the specified accessor function or static number.
      @param {Function|Number} [*value*]
      @example <caption>default accessor</caption>
function(d) {
  return d.height || 200;
}
  */
  height(_) {
    return arguments.length ? (this._height = typeof _ === "function" ? _ : constant(_), this) : this._height;
  }

  /**
      @memberof TextBox
      @desc Defines the unique id for each box to the specified accessor function or static number.
      @param {Function|Number} [*value*]
      @example <caption>default accessor</caption>
function(d, i) {
  return d.id || i + "";
}
  */
  id(_) {
    return arguments.length ? (this._id = typeof _ === "function" ? _ : constant(_), this) : this._id;
  }

  /**
      @memberof TextBox
      @desc Sets the line height to the specified accessor function or static number, which is 1.4 times the [font size](#textBox.fontSize) by default.
      @param {Function|Number} [*value*]
  */
  lineHeight(_) {
    return arguments.length ? (this._lineHeight = typeof _ === "function" ? _ : constant(_), this) : this._lineHeight;
  }

  /**
      @memberof TextBox
      @desc Sets the text overflow to the specified accessor function or static boolean.
      @param {Function|Boolean} [*value* = false]
  */
  overflow(_) {
    return arguments.length ? (this._overflow = typeof _ === "function" ? _ : constant(_), this) : this._overflow;
  }

  /**
      @memberof TextBox
      @desc Sets the pointer-events to the specified accessor function or static string.
      @param {Function|String} [*value* = "auto"]
  */
  pointerEvents(_) {
    return arguments.length ? (this._pointerEvents = typeof _ === "function" ? _ : constant(_), this) : this._pointerEvents;
  }

  /**
      @memberof TextBox
      @desc Sets the rotate percentage for each box to the specified accessor function or static string.
      @param {Function|Number} [*value* = 0]
  */
  rotate(_) {
    return arguments.length ? (this._rotate = typeof _ === "function" ? _ : constant(_), this) : this._rotate;
  }

  /**
      @memberof TextBox
      @desc Sets the SVG container element to the specified d3 selector or DOM element. If not explicitly specified, an SVG element will be added to the page for use.
      @param {String|HTMLElement} [*selector*]
  */
  select(_) {
    return arguments.length ? (this._select = select(_), this) : this._select;
  }

  /**
      @memberof TextBox
      @desc Sets the word split behavior to the specified function, which when passed a string is expected to return that string split into an array of words.
      @param {Function} [*value*]
  */
  split(_) {
    return arguments.length ? (this._split = _, this) : this._split;
  }

  /**
      @memberof TextBox
      @desc Sets the text for each box to the specified accessor function or static string.
      @param {Function|String} [*value*]
      @example <caption>default accessor</caption>
function(d) {
  return d.text;
}
  */
  text(_) {
    return arguments.length ? (this._text = typeof _ === "function" ? _ : constant(_), this) : this._text;
  }

  /**
      @memberof TextBox
      @desc Sets the horizontal text anchor to the specified accessor function or static string, whose values are analagous to the SVG [text-anchor](https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/text-anchor) property.
      @param {Function|String} [*value* = "start"]
  */
  textAnchor(_) {
    return arguments.length ? (this._textAnchor = typeof _ === "function" ? _ : constant(_), this) : this._textAnchor;
  }

  /**
      @memberof TextBox
      @desc Sets the vertical alignment to the specified accessor function or static string. Accepts `"top"`, `"middle"`, and `"bottom"`.
      @param {Function|String} [*value* = "top"]
  */
  verticalAlign(_) {
    return arguments.length ? (this._verticalAlign = typeof _ === "function" ? _ : constant(_), this) : this._verticalAlign;
  }

  /**
      @memberof TextBox
      @desc Sets the width for each box to the specified accessor function or static number.
      @param {Function|Number} [*value*]
      @example <caption>default accessor</caption>
function(d) {
  return d.width || 200;
}
  */
  width(_) {
    return arguments.length ? (this._width = typeof _ === "function" ? _ : constant(_), this) : this._width;
  }

  /**
      @memberof TextBox
      @desc Sets the x position for each box to the specified accessor function or static number. The number given should correspond to the left side of the textBox.
      @param {Function|Number} [*value*]
      @example <caption>default accessor</caption>
function(d) {
  return d.x || 0;
}
  */
  x(_) {
    return arguments.length ? (this._x = typeof _ === "function" ? _ : constant(_), this) : this._x;
  }

  /**
      @memberof TextBox
      @desc Sets the y position for each box to the specified accessor function or static number. The number given should correspond to the top side of the textBox.
      @param {Function|Number} [*value*]
      @example <caption>default accessor</caption>
function(d) {
  return d.y || 0;
}
  */
  y(_) {
    return arguments.length ? (this._y = typeof _ === "function" ? _ : constant(_), this) : this._y;
  }

}
