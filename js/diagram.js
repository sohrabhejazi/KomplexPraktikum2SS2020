class Diagram {
    constructor(pltData, diagramDivId) {  // pltData .. Object like fetched data-var, but values as array
        this.diagramDivId = diagramDivId;
        this.pltData = pltData;
        this.align_data = align_data;
        this.cntMed = this.allocateDatesOnLine();  // single medications get line-nr
        this.min = 0;  // this is the initial (when no values are selected) y-min-value
        this.scale_factor = 20;  // initial distance between ticks (so y-axis will initial scale from min to min+9*20)
        // diagram has a fixed height (around 500px), also align_data has a fixed length. This can be used to set ticks with distance
        this.ticks_cnt = Math.floor((this.height - this.yAxisOffset - (this.align_data.length * 30)) / 30);  // to initial scale y for values, with tick-distance round about 30
        this.totalWidth = document.getElementById(this.diagramDivId).offsetWidth - 30;
        this.colorMapping = createCheckboxList(this.pltData, this.diagramDivId);  // create checkboxlist and initialize data in value_groups and colorsetting
        this.svg = d3.select("#" + this.diagramDivId)
            .append("svg")
            .attr("class", "diagramSvgElement")
            .style("min-width", (this.width + style["margin"].left + style["margin"].right - 5) + "px")
            .attr("height", style["totalHeight"])
            .attr("preserveAspectRatio", "none")
            .append("g")
            .attr("transform", "translate(" + style["margin"].left + "," + style["margin"].top + ")");
        [this.minDate, this.maxDate] = this.getXDomain();  // conclusions from initial getXDomain-setting
        this.x = d3.scaleTime()
            .domain(this.getOffsetOuterDate())
            .range([0, this.width])
            .nice();
        this.y = d3.scaleLinear()
            .domain([-this.scale_factor * this.align_data.length - this.yAxisOffset, this.min + (this.ticks_cnt - 1) * this.scale_factor])
            .range([this.height, 0]);
        this.addXYAxis(this.getTicksWithLabels(this.min, this.min + this.ticks_cnt * this.scale_factor));
        this.createDateSlider();
        this.scatter = this.appendClipPath();
        this.pltResources = {
            "lines": {},
            "points": {},
            "encounter": this.plotEncounters(),
            "conditions": this.plotCircleSeries("conditions"),
            "labRequest": this.plotCircleSeries("labRequest"),
            "mibiRequest": this.plotCircleSeries("mibiRequest"),
            "medication": this.plotMedication()
        };
        this.encounters = Object.keys(data["encounter"]);
        this.appendLines();  // appends path-Lines, rangeLimits and marker of lines to pltResources

        //initial view: don't show any line or range limit
        for (let key = 0; key < this.colorMapping["codeList"].length; key++) {
            toggleLine(this.colorMapping["codeList"][key], 0, this.diagramDivId);
            toggleRangeLimits(this.colorMapping["codeList"][key], 0, this.diagramDivId);
        }
        const mibi = this.plotMibigrams();
        this.pltResources["mibiObservations"] = mibi[0];
        this.pltResources["abgObservations"] = mibi[1];
    }

    get width() {
        return this.totalWidth - style["margin"].left - style["margin"].right;
    }

    get height() {
        return style["totalHeight"] - style["margin"].top - style["margin"].bottom;
    }

    get yAxisOffset() {  // offset for medication (lower y part)
        return this.cntMed <= 0 ? this.scale_factor : 0.5 * this.scale_factor * (this.cntMed - 1);
    }

    addXYAxis(ticks) {
        this.svg.append("g")
            .attr("class", "y axis")
            .call(d3.axisLeft(this.y)
                .tickValues(ticks[0])
                .tickFormat(function (d, i) {
                    return ticks[1][i];
                }));
        this.svg.append("g")
            .attr("transform", "translate(0," + this.y(ticks[0][this.align_data.length]) + ")")  // move to y-min
            .attr("class", "x axis")
            .call(d3.axisBottom(this.x)
                .tickFormat(d3.timeFormat("%d.%m.%Y"))
                .ticks(Math.ceil(this.width / 160)));  // split width of x-axis for number of date-ticks
    }

    getXDomain() {  // search for min and max in all Data-values, add an offset for full display of outer date points
        const allDates = getAllColValues(this.pltData, date_columns).map(date => formatDate(date));
        return [new Date(Math.min.apply(null, allDates)), this.maxDate = new Date(Math.max.apply(null, allDates))];
    }

    getOffsetOuterDate() {
        return [new Date(this.minDate.setHours(this.minDate.getHours() - 15)), new Date(this.maxDate.setHours(this.maxDate.getHours() + 15))];
    }

    createDateSlider() {
        let sliderMargin = 15, sliderHeight = 20;
        let sliderWidth = 300 - 2 * sliderMargin;
        let sliderSvg = d3.select("#" + this.diagramDivId + "svgFrameSlider")
            .attr("id", this.diagramDivId + "svgFrameSlider")
            .append("svg")
            .attr("width", sliderWidth)
            .attr("height", sliderHeight)
            .style("vertical-align", "initial");
        let sliderRender = $("#" + this.diagramDivId + "svgFrameSlider");
        let setWidth = parseInt(sliderRender.css("width").split("px")[0]) - 2;  // -2 for border-width
        sliderRender.css("width", setWidth);
        let sliderX = d3.scaleTime()
            .domain([this.minDate, this.maxDate])
            .range([0, setWidth - 2]);
        let self = this;
        sliderSvg.append("g")  // preview for encounters
            .selectAll("dot")
            .data(this.pltData["encounter"])
            .enter()
            .append("rect")
            .attr("class", "rectPltElement")
            .attr("x", function (d) {
                return sliderX(formatDate(d["start"]));
            })
            .attr("y", 5)
            .attr("width", function (d) {
                return sliderX(formatDate(d["end"])) - sliderX(formatDate(d["start"]));
            })
            .attr("height", sliderHeight - 10)
            .style("fill", pltColors["primary"])
            .style("opacity", 0.6);

        let brush = d3.brushX()
            .extent([[0, 0], [setWidth, sliderHeight]])
            .on("brush", getBrushed);

        let brushGroup = sliderSvg.append("g")
            .attr("class", "brush")
            .call(brush);

        function getBrushed() {
            const range = d3.brushSelection(this)
                .map(sliderX.invert);
            self.rescaleX(range[0], range[1]);
            let d = range[0];
            $("#" + self.diagramDivId + "startDateSlider").text(get2D(d.getDate()) + "." + get2D(d.getMonth() + 1) + "." + d.getFullYear());
            d = range[1];
            $("#" + self.diagramDivId + "endDateSlider").text(get2D(d.getDate()) + "." + get2D(d.getMonth() + 1) + "." + d.getFullYear());
        }

        brush.move(brushGroup, [this.minDate, this.maxDate].map(sliderX));
    }

    appendClipPath() {
        // this clip is an rect over the display-area of the chart (right side from the y-labels), used to slide on x-axis and don't show overflow-thigns
        const clip = this.svg.append("defs")
            .append("svg:clipPath")
            .attr("id", this.diagramDivId + "clip")
            .append("rect")
            .attr("width", this.width)
            .attr("height", this.height + 0.5 * this.scale_factor)
            .attr("x", 0)
            .attr("y", 0);
        return this.svg.append("g")
            .attr("clip-path", "url(#" + this.diagramDivId + "clip)");
    }

    appendLineGroup(className, lineData, colorFunc, idPrefix) {
        const x = this.x, y = this.y, diaId = this.diagramDivId;
        return this.scatter.selectAll(".line")
            .data(lineData)
            .enter()
            .append("path")
            .attr("class", className)
            .attr("stroke", function (d) {
                return colorFunc(d.key);
            })
            .attr("id", function (d) {
                return idPrefix + id_sep + diaId + id_sep + d.key;
            })
            .attr("d", function (d) {
                return d3.line()
                    .x(function (d) {
                        return x(formatDate(d.date));
                    })
                    .y(function (d) {
                        return y(+d.value);
                    })
                    (d.values);
            });
    }

    appendMarkers(markerData, valueKey) {
        const y = this.y, colorMapping = this.colorMapping;
        let yValue = function (d) {
            return y(d.value);
        };
        let stroke = function (d) {
            return colorMapping[d.code];
        };
        let fill = function (d) {
            let range = data["values"][d.range]
            if (!("low" in range) && !("high" in range)) return "none";
            let notTooLow = "low" in range && range["low"] < d.value;
            let notTooHigh = "high" in range && range["high"] > d.value;
            return notTooLow && notTooHigh ? "white" : stroke(d);
        }
        return this.plotCircles(markerData, "date", yValue, "points", "code", fill, value_groups[valueKey]["marker"], "valueMarker" + value_groups[valueKey]["marker"], stroke);
    }

    appendLines() {
        const color = d3.scaleOrdinal()
            .domain(this.colorMapping["codeList"])
            .range(this.colorMapping["colorList"]);
        let rangeRef = {}, valuesRef;
        for (let key = 0; key < rangeLimits.length; key++) {
            rangeRef[rangeLimits[key]] = [];
        }
        for (let key in value_groups) {
            const diaData = value_groups[key]["data"];
            this.pltResources["lines"][key] = this.appendLineGroup("valueLines", diaData, color, "path");
            this.pltResources["points"][key] = this.appendMarkers(this.pltData[key], key);
            // now get low/high range for every observation code (if available) and create+store line elements
            const [roundminDate, roundmaxDate] = this.getOffsetOuterDate();
            for (let elem = 0; elem < diaData.length; elem++) {
                if ("range" in diaData[elem]["values"][0] && diaData[elem]["values"][0]["range"] in data["values"]) {
                    valuesRef = data["values"][diaData[elem]["values"][0]["range"]];
                    for (let rangeElem = 0; rangeElem < rangeLimits.length; rangeElem++) {
                        if (rangeLimits[rangeElem] in valuesRef) {
                            rangeRef[rangeLimits[rangeElem]].push({
                                "key": diaData[elem]["key"],
                                "values": [{
                                    "value": valuesRef[rangeLimits[rangeElem]],
                                    "date": getDateRepresentation(roundminDate, false)
                                },
                                    {
                                        "value": valuesRef[rangeLimits[rangeElem]],
                                        "date": getDateRepresentation(roundmaxDate, false)
                                    }]
                            });
                        }
                    }
                }
            }
        }
        for (let rangeElem = 0; rangeElem < rangeLimits.length; rangeElem++) {
            this.pltResources["lines"][rangeLimits[rangeElem]] = this.appendLineGroup("range", rangeRef[rangeLimits[rangeElem]], color, "range" + rangeLimits[rangeElem]);
        }
    }

    getTicksWithLabels(min, max) {  // for y-axis
        let ticks = [];
        for (let i = min - this.align_data.length * this.scale_factor; i < (min - 0.5 * this.scale_factor); i += this.scale_factor) {  // -0.5*scale_factor is an anti-precision-float-solve-choice
            ticks.push(Math.round(i * 1000) / 1000);
        }
        let tickLabels = this.align_data.length ? display_data.slice().reverse() : [];
        ticks.push(Math.round(min * 1000) / 1000);
        tickLabels.push(ticks[ticks.length - 1]);
        let i = 1;
        while (max - i * this.scale_factor > min + 0.5 * this.scale_factor) {  // +0.5*scale_factor is an anti-precision-float-solve-choice
            ticks.push(Math.round((min + i * this.scale_factor) * 1000) / 1000);
            tickLabels.push(ticks[ticks.length - 1]);
            i++;
        }
        return [ticks, tickLabels];
    }

    rescaleX(min, max) {
        this.x.domain([min, max])
        this.svg.selectAll("g .x").transition().duration(0)
            .call(d3.axisBottom(this.x)
                .tickFormat(d3.timeFormat("%d.%m.%Y"))
                .ticks(Math.ceil(this.width / 160)));
        const x = this.x, y = this.y;
        for (let key in this.pltResources) {  // translate all pltResources
            if (key === "encounter" || key === "medication") {
                let colStartName = date_columns[key].indexOf("start") >= 0 ? "start" : "date";
                this.pltResources[key]
                    .transition().duration(0)
                    .attr("x", function (d) {
                        return x(formatDate(d[colStartName]));
                    })
                    .attr("width", function (d) {
                        return x(formatDate(d["end"])) - x(formatDate(d[colStartName]));
                    });
            } else if (key === "lines") {
                for (let subkey in this.pltResources[key]) {
                    this.pltResources[key][subkey].transition().duration(0)
                        .attr("d", function (d) {
                            return d3.line()
                                .x(function (d) {
                                    return x(formatDate(d.date));
                                })
                                .y(function (d) {
                                    return y(d.value);
                                })(d.values);
                        });
                }
            } else if (key === "points") {
                this.pltResources[key]["labObservations"].transition().duration(0)
                    .attr("cx", function (d) {
                        return x(formatDate(d["date"]));
                    });
                this.pltResources[key]["observations"].transition().duration(0)
                    .attr("x", function (d) {
                        return x(formatDate(d["date"]));
                    });
            } else {
                this.pltResources[key].transition().duration(0)
                    .attr("cx", function (d) {
                        return x(formatDate(d["key"]));
                    });
            }
        }
    }

    rescaleY() {
        let min, max;
        const selected = getSelectedCodeElements(this.diagramDivId);
        if (selected.length > 0) {
            let allValues = [], range;  // collect all values, that should be shown
            for (let i = 0; i < selected.length; i++) {
                for (let key in value_groups) {
                    for (let entry = 0; entry < value_groups[key]["data"].length; entry++) {
                        if (selected[i] === value_groups[key]["data"][entry]["key"]) {
                            if ($("#" + this.diagramDivId + "showRangeCheckbox").is(":checked")) {  // consider range-limit-lines
                                range = data["values"][value_groups[key]["data"][entry]["values"][0]["range"]];
                                if ("low" in range) allValues.push(range["low"]);
                                if ("high" in range) allValues.push(range["high"]);
                            }
                            allValues.push.apply(allValues, value_groups[key]["data"][entry]["values"].map(e => e.value));
                            break;
                        }
                    }
                }
            }
            min = Math.min.apply(Math, allValues);  // try to get a nice tick-scale-factor
            max = Math.max.apply(Math, allValues);
        } else {
            min = this.min;
            max = this.min + this.ticks_cnt * this.scale_factor;
        }
        let scale_factor = (max - min) / (this.ticks_cnt - 1);
        let i = Math.ceil(Math.log10(scale_factor) - 1);
        if (i < 0) i++;
        this.scale_factor = Math.ceil(scale_factor / Math.pow(10, i)) * Math.pow(10, i);
        min = this.scale_factor * Math.floor(min / this.scale_factor);
        max = this.scale_factor * Math.ceil((max + 1) / this.scale_factor);
        const ticks = this.getTicksWithLabels(min, max + scale_factor);
        let offset = this.align_data.length ? this.yAxisOffset : 0;
        this.y = d3.scaleLinear().domain([min - this.scale_factor * this.align_data.length - offset, max]).range([this.height, 0]);
        this.min = min;
        this.svg.selectAll("g .y")
            .transition()
            .call(d3.axisLeft(this.y)
                .tickValues(ticks[0])
                .tickFormat(function (d, i) {
                    return ticks[1][i];
                }));
        this.svg.selectAll("g .x")
            .transition()
            .attr("transform", "translate(0," + this.y(min) + ")")  // move to y-min
        const x = this.x, y = this.y, enc = this.encounters;

        function encOpacity(d) {
            return enc.indexOf(d) >= 0 ? 1 : 0;
        }

        const selectedCodes = getSelectedCodeElements(this.diagramDivId);
        for (let key in this.pltResources) {  // translate all pltResources
            if (!(this.align_data.length) && align_data.indexOf(key) >= 0) {
                this.pltResources[key].style("opacity", 0);
                continue;
            }
            if (key === "encounter") {
                this.pltResources[key].transition()
                    .attr("y", this.y(this.getYScalePosition(key)) - 5)
                    .style("opacity", function (d) {
                        return encOpacity(d.id)
                    });
            } else if (key === "lines") {
                for (let subkey in this.pltResources[key]) {
                    this.pltResources[key][subkey].transition().duration(0)
                        .attr("d", function (d) {
                            return d3.line()
                                .x(function (d) {
                                    return x(formatDate(d.date));
                                })
                                .y(function (d) {
                                    return y(d.value);
                                })(d.values)
                        });
                }
            } else if (key === "points") {
                this.pltResources[key]["labObservations"].transition().duration(0)
                    .attr("cy", function (d) {
                        return y(d.value);
                    })
                    .style("opacity", function (d) {
                        return selectedCodes.indexOf(d.code) >= 0 ? 1 : 0
                    });
                this.pltResources[key]["observations"].transition().duration(0)
                    .attr("y", function (d) {
                        return y(d.value) - 2;
                    })
                    .style("opacity", function (d) {
                        return selectedCodes.indexOf(d.code) >= 0 ? 1 : 0
                    });
            } else if (key === "medication") {
                let yMed = this.y(this.getYScalePosition(key));
                this.pltResources[key].transition()
                    .attr("y", function (d) {
                        return yMed - 7 + 15 * d.line;
                    })
                    .style("opacity", function (d) {
                        return encOpacity(d.encounter)
                    });
            } else {
                this.pltResources[key].transition()
                    .attr("cy", this.y(this.getYScalePosition(key)))
                    .style("opacity", function (d) {
                        for (let i = 0; i < d["values"].length; i++) {
                            if (encOpacity(d["values"][i].encounter)) return 1;
                        }
                        return 0;
                    });
            }
        }
    }

    setAlignData(aData) {
        this.align_data = aData;
        this.rescaleY();
        if (aData.length) this.showEncounters();
    }

    getYScalePosition(entry) {
        return this.min - (this.align_data.indexOf(entry) + 1) * this.scale_factor;
    }

    changeEncounters(encounters) {
        this.encounters = encounters;
        this.showEncounters();
    }

    showEncounters() {
        let y = this.y, x = this.x, enc = this.encounters;

        function encOpacity(d) {
            return enc.indexOf(d) >= 0 ? 1 : 0;
        }

        let selectedCodes = getSelectedCodeElements(this.diagramDivId);
        let showPartPath = [];
        for (let key in this.pltResources) {
            if (!(["lines", "points"].indexOf(key) >= 0)) continue;
            switch (key) {
                case "lines":
                    for (let subkey in value_groups) {
                        showPartPath = []
                        for (let i = 0; i < value_groups[subkey]["data"].length; i++) {
                            let pathKey = [];
                            let d = value_groups[subkey]["data"][i];
                            for (let j = 0; j < d["values"].length; j++) {
                                if (encOpacity(d["values"][j].encounter)) pathKey.push(d["values"][j]);
                            }
                            showPartPath.push({key: d["key"], values: pathKey})
                        }
                        this.pltResources[key][subkey]
                            .data(showPartPath)
                            .enter();
                    }
                    break;
                case "points":
                    for (let subkey in value_groups) {
                        showPartPath = []
                        for (let i = 0; i < this.pltData[subkey].length; i++) {
                            if (encOpacity(this.pltData[subkey][i].encounter)) showPartPath.push(this.pltData[subkey][i]);
                        }
                        this.pltResources[key][subkey].remove();
                        this.pltResources[key][subkey] = this.appendMarkers(showPartPath, subkey);
                    }
                    break;
            }
            this.rescaleY();
        }
    }

    plotEncounters() {
        const x = this.x, diaId = this.diagramDivId;
        return this.scatter.append("g")  // rects
            .selectAll("dot")
            .data(this.pltData["encounter"])
            .enter()
            .append("rect")
            .attr("class", "rectPltElement")
            .attr("x", function (d) {
                return x(formatDate(d["start"]));
            })
            .attr("y", this.y(this.getYScalePosition("encounter")) - 7)
            .attr("width", function (d) {
                return x(formatDate(d["end"])) - x(formatDate(d["start"]));
            })
            .attr("height", 15)
            .attr("id", function (d) {
                return "encounter" + id_sep + diaId + id_sep + d.id;
            })
            .style("fill", pltColors["primary"])
            .on("mouseover", mouseover)
            .on("mousemove", mousemove)
            .on("mouseleave", mouseleave);
    }

    plotCircles(allData, xDateKey, yValues, idPrefix, idSuffixKey, colorFunc = pltColors["secondary"], elemType = "circle", className = "resourceDatePoints", stroke = "black") {
        const x = this.x, diaId = this.diagramDivId;
        const markerStyle = {
            "circle": {xName: "cx", yName: "cy", xOffset: 0},
            "rect": {xName: "x", yName: "y", xOffset: 5}
        };
        return this.scatter.selectAll("dot")
            .data(allData)
            .enter()
            .append(elemType)
            .attr("class", className)
            .attr(markerStyle[elemType].xName, function (d) {
                return x(formatDate(d[xDateKey])) - markerStyle[elemType].xOffset;
            })
            .attr(markerStyle[elemType].yName, yValues)
            .attr("id", function (d) {
                return idPrefix + id_sep + diaId + id_sep + d[idSuffixKey];
            })
            .attr("stroke", stroke)
            .attr("fill", colorFunc)
            .on("mouseover", mouseover)
            .on("mousemove", mousemove)
            .on("mouseleave", mouseleave);
    }

    plotCircleSeries(dataName) {  // plot unique data with one date value as circles on their y-line in the svg, used for conditions, labRequests, mibiRequest
        this.pltData[dataName] = nestData(this.pltData[dataName], date_columns[dataName][0]);
        return this.plotCircles(this.pltData[dataName], "key", this.y(this.getYScalePosition(dataName)), dataName, "key");
    }

    plotMibigrams() {
        const mibiObservation = nestData(this.pltData["mibiObservations"], date_columns["mibiObservations"][0]);
        const colors = getColors(2 * mibiObservation.length, "90%", "42%").slice(0, mibiObservation.length);
        // give every mibiObservation-Point a color. such a point can present multiple mibiObservations (with the same date -> they will have the same color)
        for (let i = 0; i < colors.length; i++) {
            for (let mibiOb = 0; mibiOb < mibiObservation[i]["values"].length; mibiOb++) {  // iterate over mibiObs in one point
                for (let abg = 0; abg < mibiObservation[i]["values"][mibiOb]["abgObservations"].length; abg++) {  // set mibiObs color for related abgObs
                    this.pltData["abgObservations"].find(x => x.id === mibiObservation[i]["values"][mibiOb]["abgObservations"][abg])["pltColor"] = colors[i];
                }
            }
        }
        let mibiColor = function (d) {
            return colors[mibiObservation.indexOf(d)];
        }
        let result = [this.plotCircles(mibiObservation, "key", this.y(this.getYScalePosition("mibiObservations")), "mibiObservations", "key", mibiColor)];
        const abgObservation = nestData(this.pltData["abgObservations"], date_columns["abgObservations"][0]);

        let abgColor = function getAbgColor(d) {
            const color = d["values"][0]["pltColor"];
            for (let j = 1; j < d["values"].length; j++) {
                if (d["values"][j]["pltColor"] !== color) {
                    return "black";  // use color black if there are multiple abgObservations related to different mibiObservations
                }
            }
            return color;
        }

        result.push(this.plotCircles(abgObservation, "key", this.y(this.getYScalePosition("abgObservations")), "abgObservations", "key", abgColor));
        return result;
    }

    plotMedication() {
        const x = this.x, y = this.y, yMed = this.y(this.getYScalePosition("medication")), diaId = this.diagramDivId;
        const medHeight = 12;
        return this.scatter.append("g")
            .selectAll("dot")
            .data(this.pltData["medication"])
            .enter()
            .append("rect")
            .attr("class", "rectPltElement")
            .attr("x", function (d) {
                return x(formatDate(d["date"]));
            })
            .attr("y", function (d) {  // get medication-y and add line-y
                return yMed - 7 + 15 * d.line;  // medHeight + 3px distance = 15
            })
            .attr("width", function (d) {
                return x(formatDate(d["end"])) - x(formatDate(d["date"]));
            })
            .attr("height", medHeight)
            .attr("id", function (d) {
                return "medication" + id_sep + diaId + id_sep + d.id;
            })
            .style("fill", function (d) {
                return d.color;
            })
            .on("mouseover", mouseover)
            .on("mousemove", mousemove)
            .on("mouseleave", mouseleave);
    }

    allocateDatesOnLine() {
        function getParallelMedication(med, start, end) {
            let parallels = [];
            for (let i = 0; i < med.length; i++) {
                if (!(med[i].end < start || end < med[i].start)) {
                    parallels.push(i);
                    med[i]["parallel"].push(med.length);
                }
            }
            return parallels;
        }

        if (!this.pltData["medication"].length) return 0;
        let medication = [];
        let colorCodes = new Set();
        for (let i = 0; i < this.pltData["medication"].length; i++) {
            this.pltData["medication"][i].id = i;
            let medi = {
                "id": i,
                "start": formatDate(this.pltData["medication"][i].date),
                "end": formatDate(this.pltData["medication"][i].end),
                "line": null,
                "resource": this.pltData["medication"][i]
            };
            colorCodes.add(this.pltData["medication"][i].code);
            medi["parallel"] = getParallelMedication(medication, formatDate(this.pltData["medication"][i].date), formatDate(this.pltData["medication"][i].end));
            medication.push(medi);
        }
        colorCodes = Array.from(colorCodes);
        let colorForCodes = getColors(colorCodes.length, "66%", "61%");
        let k = 1, stack;
        for (k; k < medication.length + 1; k++) {  // build stack
            let medMod = medication.map(a => Object.assign({}, a));  // deep copy
            stack = [];
            do {
                let next = medMod.reduce(function (res, obj) {
                    return (obj.parallel.length < res.parallel.length) ? obj : res;
                }, medMod[0]);
                if (next.parallel.length >= k) break;
                stack.push(next.id);
                medMod = medMod.filter(e => e.id !== next.id);
                for (let i = 0; i < next.parallel.length; i++) {  // remove id from meds having this as parallel
                    let para = medMod.filter(e => e.id === next.parallel[i]);
                    if (para.length) {
                        para = para[0];
                        para.parallel = para.parallel.filter(e => e !== next.id);
                    }
                }
            } while (medMod.length);
            if (stack.length === medication.length) break;
        }
        stack.reverse();
        for (let i = 0; i < stack.length; i++) {  // assign lines to medication-entries
            let med = medication[stack[i]];
            let notLine = [];  // lines with parallel medication on
            for (let j = 0; j < i; j++) {
                if (med.parallel.indexOf(stack[j]) >= 0) notLine.push(medication[stack[j]].line);
            }
            for (let j = 0; j < k; j++) {  // get minimum k that isn't the line of a parallel medication
                if (notLine.indexOf(j) < 0) {
                    med.line = j;
                    let target = this.pltData["medication"].filter(e => e.id === stack[i])[0];
                    target["line"] = j;
                    target["color"] = colorForCodes[colorCodes.indexOf(target["code"])];
                    break;
                }
            }
        }
        return k + 1;
    }
}
