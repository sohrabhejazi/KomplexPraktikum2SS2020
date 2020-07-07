var data = {}

function get2D(number) {  // function especially for date-representation -> getting 2 digits-representation
    return ("0" + number).slice(-2)
}

function getDateRepresentation(d, withZOff=true) {  // dates in FHIR Ressources are stored with "+Z.."
    if (withZOff) d = new Date(d.split("+")[0]);
    return get2D(d.getDate()) + "." + get2D(d.getMonth() + 1) + "." + d.getFullYear() + " " + get2D(d.getHours()) + ":" + get2D(d.getMinutes()) + ":" + get2D(d.getSeconds());
}

function getPatient(patient) {
    data["patient"] = {}
    data["patient"]["name"] = patient.name[0].family + ", " + patient.name[0].given.join(" ");
    var gender = {"female": "weiblich", "male": "männlich", "other": "divers"}
    data["patient"]["gender"] = gender[patient.gender];

    var d = new Date(patient.birthDate)
    var patientAge = ("0" + d.getDate()).slice(-2) + "." + ("0" + (d.getMonth() + 1)).slice(-2) + "." + d.getFullYear();
    var ageDate = Math.abs(new Date(Date.now() - d.getTime()).getFullYear() - 1970);
    data["patient"]["age"] = patientAge + ", " + ageDate + " Jahre";

    var street = "line" in patient.address[0] ? patient.address[0].line.join(", ") : "";
    data["patient"]["address"] = street + ", " + patient.address[0].postalCode + " " + patient.address[0].city;
}

function getEncountersAndConditions(encounters, conditions) {
    data["encounter"] = {};
    data["conditions"] = {};
    var cond_id, cond_resource;
    var rank = {"1": "primär", "2": "sekundär"};
    encounters.forEach(function (encounter) {
        data["encounter"][encounter.id] = {
            "id": encounter.id,
            "start": getDateRepresentation(encounter.period.start),
            "end": getDateRepresentation(encounter.period.end)
        };
        for (var cKey in encounter.diagnosis) {
            cond_id = encounter.diagnosis[cKey].condition.reference.split("/")[1];
            cond_resource = conditions.find(x => x.id === cond_id);
            data["conditions"][cond_id] = {
                "code": cond_resource.code.coding[0].code,
                "system": cond_resource.code.coding[0].system,
                "version": cond_resource.code.coding[0].version,
                "display": cond_resource.code.coding[0].display,
                "date": getDateRepresentation(cond_resource.recordedDate),
                "encounter": encounter.id,
                "rank": rank[encounter.diagnosis[cKey].rank]
            };
        }
    });
}

function getServiceRequests(requests) {
    data["labRequest"] = {};
    data["mibiRequest"] = {};
    var req_class;
    requests.forEach(function (request) {
        req_class = ("specimen" in request && request["specimen"].length) ? "mibiRequest" : "labRequest";
        data[req_class][request.id] = {
            "id": request.id,
            "encounter": request.encounter.reference.split("/")[1],
            "authoredOn": getDateRepresentation(request.authoredOn)
        }
        if (req_class === "mibiRequest") {
            data[req_class][request.id]["specimen"] = request.specimen[0].reference.split("/")[1];
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
        if ("basedOn" in ob && ob.basedOn[0].reference.startsWith("ServiceRequest/")) {
            if (ob.basedOn[0].reference.split("/")[1] in data["mibiRequest"]) {
                if ("interpretation" in ob && ob.interpretation.length) {  // observation is an abgResult
                    interpr = ob.interpretation[0].coding[0].code;
                    data["abgObservations"][ob.id] = {
                        "id": ob.id,
                        "code": ob.code.coding[0].code,
                        "date": getDateRepresentation(ob.effectiveDateTime),
                        "encounter": ob.encounter.reference.split("/")[1],
                        "mibiObservation": ob.derivedFrom[0].reference.split("/")[1],
                        "serviceRequest": ob.basedOn[0].reference.split("/")[1],
                        "interpretation": interpr in Object.keys(interpr_code) ? interpr_code[interpr] : interpr
                    }
                } else {  // observation is a mibiResult
                    data["mibiObservations"][ob.id] = {
                        "id": ob.id,
                        "code": ob.code.coding[0].code,
                        "system": ob.code.coding[0].system,
                        "version": ob.code.coding[0].version,
                        "display": ob.code.coding[0].display,
                        "date": getDateRepresentation(ob.effectiveDateTime),
                        "encounter": ob.encounter.reference.split("/")[1],
                        "abgObservations": "hasMember" in ob ? ob.hasMember.map(o => o.reference.split("/")[1]) : [],
                        "serviceRequest": ob.basedOn[0].reference.split("/")[1]
                    }
                }
            } else {  // observation is a labResult
                data["labObservations"][ob.id] = {
                    "code": ob.code.coding[0].code,
                    "system": ob.code.coding[0].system,
                    "version": ob.code.coding[0].version,
                    "display": ob.code.coding[0].display,
                    "date": getDateRepresentation(ob.effectiveDateTime),
                    "encounter": ob.encounter.reference.split("/")[1],
                    "serviceRequest": ob.basedOn[0].reference.split("/")[1],
                    "value": ob.valueQuantity.value,
                    "range": ob.code.coding[0].code + "-" + ob.code.coding[0].system + "-" + ob.code.coding[0].version
                }
                addRangeValue(data["labObservations"][ob.id]["range"], ob.valueQuantity.unit, ob.referenceRange[0]);
            }
        } else {  // observation is a vital-sign Observation
            data["observations"][ob.id] = {
                "code": ob.code.coding[0].code,
                "system": ob.code.coding[0].system,
                "version": ob.code.coding[0].version,
                "display": ob.code.coding[0].display,
                "date": getDateRepresentation(ob.effectiveDateTime),
                "encounter": ob.encounter.reference.split("/")[1],
                "value": ob.valueQuantity.value,
                "range": ob.code.coding[0].code + "-" + ob.code.coding[0].system + "-" + ob.code.coding[0].version
            }
            addRangeValue(data["observations"][ob.id]["range"], ob.valueQuantity.unit);
        }
    });
}

function getMedicationRequest(medications) {
    data["medication"] = {};
    medications.forEach(function (medication) {
        let startDate = medication.resource.authoredOn;
        data["medication"][medication.resource.id] = {
            "date": getDateRepresentation(startDate),
            "end": getDateRepresentation(new Date(new Date(startDate).setDate(new Date(startDate).getDate() + medication.resource.dispenseRequest.expectedSupplyDuration.value)), false),
            "encounter": medication.resource.encounter.reference.split("/")[1],
            "code": medication.resource.contained[0].code.coding[0].code,
            "system": medication.resource.contained[0].code.coding[0].system,
            "version": medication.resource.contained[0].code.coding[0].version,
            "display": medication.resource.contained[0].code.coding[0].display,
            "duration_in_d": medication.resource.dispenseRequest.expectedSupplyDuration.value,
            "dose": medication.resource.dosageInstruction[0].doseAndRate.map(e => e.doseQuantity["value"] + " " + e.doseQuantity["unit"]).sort().join("/"),
            "application": medication.resource.dosageInstruction[0].route,
            "interval_h": medication.resource.dosageInstruction[0].timing.repeat.period
        }
    });
}

function getDiagnosticReport(diagnostics) {
    data["diagnostics"] = {};
    diagnostics.forEach(function (dia) {
        data["diagnostics"][dia.resource.id] = {
            "serviceRequest": dia.resource.basedOn[0].reference.split("/")[1],
            "code": dia.resource.code.coding[0].code,
            "system": dia.resource.code.coding[0].system,
            "version": dia.resource.code.coding[0].version,
            "display": dia.resource.code.coding[0].display,
            "encounter": dia.resource.encounter.reference.split("/")[1],
            "result": dia.resource.result[0].reference.split("/")[1],
            "specimen": dia.resource.specimen[0].reference.split("/")[1]
        }
    });
}

function getSpecimen(specimen) {
    data["specimen"] = {};
    specimen.forEach(function (spec) {
        data["specimen"][spec.resource.id] = {
           "serviceRequest": spec.resource.request[0].reference.split("/")[1],
           "code": spec.resource.type.coding[0].code,
           "system": spec.resource.type.coding[0].system,
           "version": spec.resource.type.coding[0].version,
           "display": spec.resource.type.coding[0].display
        };
    });
}

function requestQuery(params) {
    var query = new URLSearchParams();
    for (var key in params) {
        query.set(key, params[key]);
    }
    return query;
}

FHIR.oauth2.ready().then(function (client) {
    var patientQuery = client.patient.read();
    var encounterQuery = client.request("Encounter?" + requestQuery({"patient": client.patient.id}), {
        pageLimit: 0,
        flat: true
    });
    var conditionQuery = client.request("Condition?" + requestQuery({"patient": client.patient.id}), {
        pageLimit: 0,
        flat: true
    });
    var serviceRequestQuery = client.request("ServiceRequest?" + requestQuery({"patient": client.patient.id}), {
        pageLimit: 0,
        flat: true
    });
    var observationQuery = client.request("Observation?" + requestQuery({"patient": client.patient.id}), {
        pageLimit: 0,
        flat: true
    });
    var medicationRequestQuery = client.request("MedicationRequest?", requestQuery({"patient": client.patient.id}), {
        pageLimit: 0,
        flat: true
    });
    var diagnosticReportQuery = client.request("DiagnosticReport?", requestQuery({"patient": client.patient.id}), {
        pageLimit: 0,
        flat: true
    });
    var specimenQuery = client.request("Specimen?", requestQuery({"patient": client.patient.id}), {
        pageLimit: 0,
        flat: true
    });

    return Promise.all([patientQuery, encounterQuery, conditionQuery, serviceRequestQuery, observationQuery, medicationRequestQuery, diagnosticReportQuery, specimenQuery]).then(function (res_data) {
        getPatient(res_data[0]);
        getEncountersAndConditions(res_data[1], res_data[2]);
        getObservations(res_data[4], getServiceRequests(res_data[3]));
        if ("entry" in res_data[5]) {
            getMedicationRequest(res_data[5].entry);
        } else {
            data["medication"] = {};
        }
        if ("entry" in res_data[6]) {
            getDiagnosticReport(res_data[6].entry);
        } else {
            data["diagnostics"] = {};
        }
        if ("entry" in res_data[7]) {
            getSpecimen(res_data[7].entry);
        } else {
            data["specimen"] = {};
        }
        console.log(data);
    }).then(function() {
        addDiagram();
        tooltip = createTooltip();
        displayData();
    });
});
