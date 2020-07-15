var data = {}

function get2D(number) {  // function especially for date-representation -> getting 2 digits-representation
    return ("0" + number).slice(-2)
}

function getDateRepresentation(d, withZOff = true) {  // dates in FHIR Ressources are stored with "+Z.."
    if (withZOff) d = new Date(d.split("+")[0]);
    return get2D(d.getDate()) + "." + get2D(d.getMonth() + 1) + "." + d.getFullYear() + " " + get2D(d.getHours()) + ":" + get2D(d.getMinutes()) + ":" + get2D(d.getSeconds());
}

function getPatient(patient) {
    data["patient"] = {}
    if ("name" in patient && patient.name.length) {
        let familyName = patient.name[0].family ? patient.name[0].family : "";
        let firstName = patient.name[0].given ? patient.name[0].given.join(" ") : "";
        data["patient"]["name"] = familyName + (familyName !== "" ? ", " : "") + firstName;
    } else {
        data["patient"]["name"] = "";
    }
    let gender = {"female": "weiblich", "male": "männlich", "other": "divers"};
    data["patient"]["gender"] = patient?.gender in gender ? gender[patient.gender] : "";

    var d = (patient?.birthDate && Date.parse(patient.birthDate)) ? new Date(patient.birthDate) : "";
    if (d !== "") {
        var patientAge = ("0" + d.getDate()).slice(-2) + "." + ("0" + (d.getMonth() + 1)).slice(-2) + "." + d.getFullYear();
        var ageDate = Math.abs(new Date(Date.now() - d.getTime()).getFullYear() - 1970);
        data["patient"]["age"] = patientAge + ", " + ageDate + " Jahre";
    } else {
        data["patient"]["age"] = "";
    }
    if ("address" in patient && patient.address.length) {
        let street = patient.address[0].line ? patient.address[0].line.join(", ") : "";
        let postal = patient.address[0].postalCode ? patient.address[0].postalCode : "";
        let city = patient.address[0].city ? patient.address[0].city : "";
        data["patient"]["address"] = street + (street !== "" ? ", " : "") + postal + " " + city;
    } else {
        data["patient"]["address"] = "";
    }
}

function checkNotNullNotEmpty(obj) {
    return !!obj && obj !== "";
}

function hasCoding(code) {
    return "coding" in code && code.coding.length;
}

function getEncountersAndConditions(encounters, conditions) {
    data["encounter"] = {};
    data["conditions"] = {};
    var cond_id, cond_resource;
    var rank = {"1": "primär", "2": "sekundär"};
    encounters.forEach(function (encounter) {  // require an id for an encounter and valid start and end date
        if (checkNotNullNotEmpty(encounter?.id) && encounter.period && Date.parse(encounter.period.start) && Date.parse(encounter.period.end)) {
            data["encounter"][encounter.id] = {
                "id": encounter.id,
                "start": getDateRepresentation(encounter.period.start),
                "end": getDateRepresentation(encounter.period.end)
            };
            for (var cKey in encounter.diagnosis) {
                cond_id = encounter.diagnosis[cKey]?.condition?.reference?.split("/")[1];
                if (!cond_id) continue;
                cond_resource = conditions.find(x => x.id === cond_id);
                if (Date.parse(cond_resource?.recordedDate) && hasCoding(cond_resource.code) && (cond_resource.code.coding[0].display || cond_resource.code.coding[0].code)) {  // require a valid date and display or code for coding
                    data["conditions"][cond_id] = {
                        "code": "code" in cond_resource.code.coding[0] ? cond_resource.code.coding[0].code : "",
                        "system": "system" in cond_resource.code.coding[0] ? cond_resource.code.coding[0].system : "",
                        "version": "version" in cond_resource.code.coding[0] ? cond_resource.code.coding[0].version : "",
                        "display": "display" in cond_resource.code.coding[0] ? cond_resource.code.coding[0].display : "",
                        "date": getDateRepresentation(cond_resource.recordedDate),
                        "encounter": encounter.id,
                        "rank": (encounter.diagnosis[cKey].rank in rank) ? rank[encounter.diagnosis[cKey].rank] : ""
                    };
                }
            }
        }
    });
    return data["encounter"];
}

function getServiceRequests(encounters, requests) {
    data["labRequest"] = {};
    data["mibiRequest"] = {};
    var req_class;
    requests.forEach(function (request) {
        let encounter = request?.encounter?.reference?.split("/")[1];
        // require existing encounter, intent order, valid date and valid id
        if (encounter in encounters && request.intent === "order" && checkNotNullNotEmpty(request.id) && Date.parse(request.authoredOn)) {
            req_class = ("specimen" in request && request["specimen"].length) ? "mibiRequest" : "labRequest";
            data[req_class][request.id] = {
                "id": request.id,
                "encounter": encounter,
                "authoredOn": getDateRepresentation(request.authoredOn)
            }
            if (req_class === "mibiRequest" && "reference" in request.specimen[0] && request.specimen[0].reference != null && request.specimen[0].reference !== "") {
                data[req_class][request.id]["specimen"] = request.specimen[0].reference.split("/")[1];
            }
        }
    });
    return data;
}

function addRangeValue(key, unit, range = null) {
    if (key in data["values"]) {  // check for equal values, else console warning
        if (data["values"][key]["unit"] !== unit) {
            console.log("WARNING there is an observation having an unit different from that of other observations");
        }
        if (range) {
            if ("high" in range && data["values"][key]["high"] !== range.high.value && data["values"][key]["unit"] !== range.high.unit) {
                console.log("WARNING there is an observation having a low-high range different from that of other observations");
            }
            if ("low" in range && data["values"][key]["low"] !== range.low.value && data["values"][key]["unit"] !== range.low.unit) {
                console.log("WARNING there is an observation having a low-high value-range different from that of other observations");
            }
        }
    } else {
        data["values"][key] = {"unit": unit};
        if (range) {
            if ("high" in range) {
                data["values"][key]["high"] = range.high.value;
            }
            if ("low" in range) {
                data["values"][key]["low"] = range.low.value;
            }
        }
    }
}

function getObservations(obs, _) {
    data["observations"] = {};
    data["labObservations"] = {};
    data["mibiObservations"] = {};
    data["abgObservations"] = {};
    data["values"] = {};
    var interpr_code = {"R": "resistent", "S": "anfällig"};
    obs.forEach(function (ob) {
        let id = ob?.id;
        let validDate = Date.parse(ob?.effectiveDateTime);
        let encounter = ob?.encounter?.reference?.split("/")[1];
        if (checkNotNullNotEmpty(id) && validDate && encounter in data["encounter"] && hasCoding(ob.code)) {
            let code = ob.code.coding[0].code;
            let display = ob.code.coding[0].display;
            if ("basedOn" in ob && ob.basedOn.length && ob.basedOn[0]?.reference?.startsWith("ServiceRequest/")) {
                let order = ob.basedOn[0].reference.split("/")[1];
                if (order in data["mibiRequest"]) {
                    if ("interpretation" in ob && ob.interpretation.length) {  // observation is an abgResult
                        if ("derivedFrom" in ob && ob.derivedFrom.length) {
                            let interpr = ob.interpretation[0]?.coding[0]?.code;
                            data["abgObservations"][ob.id] = {
                                "id": id,
                                "code": !!code ? code : "",
                                "date": getDateRepresentation(ob.effectiveDateTime),
                                "encounter": encounter,
                                "mibiObservation": ob.derivedFrom[0]?.reference?.split("/")[1],
                                "serviceRequest": order,
                                "interpretation": interpr in interpr_code ? interpr_code[interpr] : interpr
                            }
                        }
                    } else {  // observation is a mibiResult
                        data["mibiObservations"][ob.id] = {
                            "id": id,
                            "code": !!code ? code : "",
                            "system": !!ob.code.coding[0].system ? ob.code.coding[0].system : "",
                            "version": !!ob.code.coding[0].version ? ob.code.coding[0].version : "",
                            "display": !!display ? display : "",
                            "date": getDateRepresentation(ob.effectiveDateTime),
                            "encounter": encounter,
                            "abgObservations": "hasMember" in ob ? ob.hasMember.map(o => o?.reference?.split("/")[1]) : [],
                            "serviceRequest": order
                        }
                    }
                } else if (order in data["labRequest"] && (checkNotNullNotEmpty(display) || checkNotNullNotEmpty(code)) && parseFloat(ob.valueQuantity?.value)) {  // observation is a labResult
                    data["labObservations"][ob.id] = {
                        "code": !!code ? code : "",
                        "system": !!ob.code.coding[0].system ? ob.code.coding[0].system : "",
                        "version": !!ob.code.coding[0].version ? ob.code.coding[0].version : "",
                        "display": !!display ? display : "",
                        "date": getDateRepresentation(ob.effectiveDateTime),
                        "encounter": encounter,
                        "serviceRequest": order,
                        "value": ob.valueQuantity.value,
                        "range": ob.code.coding[0].code + "-" + ob.code.coding[0].system + "-" + ob.code.coding[0].version
                    }
                    let refRange = ("referenceRange" in ob && ob.referenceRange.length) ? ob.referenceRange[0] : null;
                    addRangeValue(data["labObservations"][ob.id]["range"], ob.valueQuantity.unit, refRange);
                }
            } else if ((checkNotNullNotEmpty(display) || checkNotNullNotEmpty(code)) && parseFloat(ob.valueQuantity?.value)) {  // observation is a vital-sign Observation
                data["observations"][ob.id] = {
                    "code": !!code ? code : "",
                    "system": !!ob.code.coding[0].system ? ob.code.coding[0].system : "",
                    "version": !!ob.code.coding[0].version ? ob.code.coding[0].version : "",
                    "display": !!display ? display : "",
                    "date": getDateRepresentation(ob.effectiveDateTime),
                    "encounter": encounter,
                    "value": ob.valueQuantity.value,
                    "range": ob.code.coding[0].code + "-" + ob.code.coding[0].system + "-" + ob.code.coding[0].version
                }
                addRangeValue(data["observations"][ob.id]["range"], "valueQuantity" in ob ? ob.valueQuantity.unit : "");
            }
        }
    });
}

function getMedicationRequest(encounters, medications) {
    data["medication"] = {};
    medications.forEach(function (medication) {
        let startDate = medication?.authoredOn;
        let encounter = medication?.encounter?.reference?.split("/")[1]
        if (encounter in encounters && Date.parse(startDate) && checkNotNullNotEmpty(medication.id) && checkNotNullNotEmpty(medication.dispenseRequest?.expectedSupplyDuration?.value) && "contained" in medication && medication.contained.length) {  // require valid start date and duration
            let start = new Date(startDate.split("+")[0]);
            let code = medication.contained[0].code;
            let coding = hasCoding(medication.contained[0].code);
            let dosage = "dosageInstruction" in medication && medication.dosageInstruction.length;
            data["medication"][medication.id] = {
                "date": getDateRepresentation(startDate),
                "end": getDateRepresentation(new Date(new Date(start).setDate(new Date(start).getDate() + medication.dispenseRequest.expectedSupplyDuration.value)), false),
                "encounter": encounter,
                "code": (coding && !!code.coding[0].code) ? code.coding[0].code : "",
                "system": (coding && !!code.coding[0].system) ? code.coding[0].system : "",
                "version": (coding && !!code.coding[0].version) ? code.coding[0].version : "",
                "display": (coding && !!code.coding[0].display) ? code?.coding[0].display : "",
                "duration_in_d": medication.dispenseRequest.expectedSupplyDuration.value,
                "dose": dosage ? medication.dosageInstruction[0].doseAndRate?.map(e => e?.doseQuantity["value"] + " " + e?.doseQuantity["unit"]).sort().join("/") : "",
                "application": dosage ? medication.dosageInstruction[0].route : "",
                "interval_h": dosage ? medication.dosageInstruction[0].timing?.repeat?.period : ""
            }
        }
    });
}

function getDiagnosticReport(diagnostics) {
    data["diagnostics"] = {};
    diagnostics.forEach(function (dia) {
        if (checkNotNullNotEmpty(dia.id) && (dia.encounter?.reference?.split("/")[1] in data["encounter"]) && hasCoding(dia.code)) {
            let result = "result" in dia && dia.result.length;
            let specimen = "specimen" in dia && dia.specimen.length;
            let basedOn = "basedOn" in dia && dia.basedOn.length;
            data["diagnostics"][dia.id] = {
                "serviceRequest": (basedOn && !!dia.basedOn[0].reference?.split("/")[1]) ? dia.basedOn[0].reference?.split("/")[1] : "",
                "code": dia.code.coding[0].code,
                "system": dia.code.coding[0].system,
                "version": dia.code.coding[0].version,
                "display": dia.code.coding[0].display,
                "encounter": dia.encounter.reference.split("/")[1],
                "result": (result && !!dia.result[0].reference?.split("/")[1]) ? dia.result[0].reference?.split("/")[1] : "",
                "specimen": (specimen && !!dia.specimen[0].reference.split("/")[1]) ? dia.specimen[0].reference?.split("/")[1] : ""
            }
        }
    });
}

function getSpecimen(specimen) {
    data["specimen"] = {};
    specimen.forEach(function (spec) {
        let order = ("request" in spec && spec.request.length) ? spec.request[0].reference?.split("/")[1] : "";
        if (checkNotNullNotEmpty(order) && hasCoding(spec.type)) {
            data["specimen"][spec.id] = {
                "serviceRequest": order,
                "code": spec.type?.coding[0].code,
                "system": spec.type?.coding[0].system,
                "version": spec.type?.coding[0].version,
                "display": spec.type?.coding[0].display
            };
        }
    });
}

function requestQuery(params) {
    var query = new URLSearchParams();
    for (let key in params) {
        query.set(key, params[key]);
    }
    return query;
}

FHIR.oauth2.ready().then(function (client) {
    let params = requestQuery({"patient": client.patient.id});
    let patientQuery = client.patient.read();
    let encounterQuery = client.request("Encounter?" + params, {
        pageLimit: 0,
        flat: true
    });
    let conditionQuery = client.request("Condition?" + params, {
        pageLimit: 0,
        flat: true
    });
    let serviceRequestQuery = client.request("ServiceRequest?" + params, {
        pageLimit: 0,
        flat: true
    });
    let observationQuery = client.request("Observation?" + params, {
        pageLimit: 0,
        flat: true
    });
    let medicationRequestQuery = client.request("MedicationRequest?" + params, {
        pageLimit: 0,
        flat: true
    });
    let diagnosticReportQuery = client.request("DiagnosticReport?" + params, {
        pageLimit: 0,
        flat: true
    });
    let specimenQuery = client.request("Specimen?" + params, {
        pageLimit: 0,
        flat: true
    });

    return Promise.all([patientQuery, encounterQuery, conditionQuery, serviceRequestQuery, observationQuery, medicationRequestQuery, diagnosticReportQuery, specimenQuery]).then(function (res_data) {
        getPatient(res_data[0]);
        let encounters = getEncountersAndConditions(res_data[1], res_data[2]);
        getObservations(res_data[4], getServiceRequests(encounters, res_data[3]));
        getMedicationRequest(encounters, res_data[5]);
        getDiagnosticReport(res_data[6]);
        getSpecimen(res_data[7]);
        console.log(data);
    }).then(function () {
        addDiagram();
        tooltip = createTooltip();
        displayData();
    });
});
