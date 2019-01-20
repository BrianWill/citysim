

var canvas = document.getElementById('canvas');
var ctx = canvas.getContext('2d');


function createCar(pos, length, velocity, targetV) {
    return {
        pos: pos,            // position of front bumper (relative to start point of lane)
        len: length,         // in meters 
        v: velocity,         // current velocity in m/s
        targetV: targetV,    // target velocity
        range: 30000,        // remaining battery power in travel meters
    };
}

var road2 = {
    posX: 348, 
    posY: 100,
    len: 200,
    angle: -10,
    cars: [
        createCar(180, 2.3, 5, 17.8816),
        createCar(150, 2.3, 10, 17.8816),
        createCar(100, 2.3, 0, 17.8816),
        createCar(50, 2.3, 5, 17.8816),
        createCar(10, 2.3, 5, 17.8816),
    ],
    next: null,
};

var road1 = {
    posX: 0,            // x coord of starting pos (middle of road)
    posY: 300,          // y coord of starting pos (middle of road)
    angle: 30,           // in degrees
    len: 400,           // in meters
    cars: [
        createCar(180, 2.3, 5, 17.8816),
        createCar(150, 2.3, 5, 27.8816),
        createCar(100, 2.3, 5, 17.8816),
        createCar(50, 2.3, 5, 17.8816),
        createCar(10, 2.3, 5, 17.8816),
    ],
    next: road2,
};

var roads = [road1, road2];

// todo: headway time should be based on relative velocities: for trailing car high v relative to prev car, a lower headway
// also lower absolute speeds = lower headway
var headway = 0.5;       // minimum distance to maintain, expressed as time in seconds to hit back of next vehicle (assuming next vehicle remains stationary)
var minDistance = 1;     // absolute minimum distance in meters
const maxV = 50;
const defaultTail = 200;   // when no car is on next road, act as if next car is 100 meters in front

const roadRenderWidth = 10;
const carRenderWidth = 6;
const roadRenderOffset = -(roadRenderWidth / 2);
const carRenderOffset = -(carRenderWidth / 2);
const acceleration = 8;     // m per s per s
const braking = 60;         // m per s per s


var mapOffsetX = 0;
var mapOffsetY = 0;
var zoom = 1;
const maxZoom = 2;
const minZoom = 0.4;
const zoomIncrement = 0.04;

function render(offsetX, offsetY) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (var r of roads) {
        ctx.save();
        ctx.fillStyle = "grey";
        ctx.scale(zoom, zoom);
        ctx.translate(r.posX + offsetX, r.posY + offsetY);
        ctx.rotate(-r.angle * Math.PI / 180);
        ctx.fillRect(0, roadRenderOffset, r.len, roadRenderWidth);
        for (var c of r.cars) {
            ctx.fillStyle = "cyan";
            ctx.fillRect(c.pos - c.len, carRenderOffset, c.len, carRenderWidth);
        }
        ctx.restore();
    }
}

function update(dt) {
    for (var r of roads) {
        var prevCar = r.next ? r.next.cars[r.next.cars.length - 1] : undefined;
        var prevTail = prevCar ? prevCar.pos - prevCar.len + r.len : r.len + defaultTail;
        var prevV = prevCar ? prevCar.v : maxV;
        var shift = 0;   // number of slots to shift up (for num cars that have left this road)
                         // normally only one car will leave road in a single update, but not safe assumption for bigger dt's and velocities
        for (var i in r.cars) {
            var c = r.cars[i];
            if (shift > 0) {
                r.cars[i - shift] = c;
            }
            var tailDistance = prevTail - minTrailingDistance(prevV) - c.pos;
            var actualHeadwayDistance = tailDistance + prevV * headway;
            var desiredHeadwayDistance = c.v * headway;
            if (actualHeadwayDistance < desiredHeadwayDistance) {
                // slow down
                c.v -= braking * dt;   // we'll assume linear braking
                if (c.v < 0) {
                    c.v = 0;
                }
            } else {
                if (c.v < c.targetV) {
                    c.v += acceleration * dt;
                    if (c.v > c.targetV) {
                        c.v = c.targetV;
                    }  
                } else {
                    c.v -= braking * dt;
                    if (c.v < 0) {
                        c.v = 0;
                    }
                }
            }
            c.pos += c.v * dt;

            if (c.pos > prevTail) {
                throw ["ACCIDENT: Car rear-ended another car: ", c];
            }

            prevTail = c.pos - c.len;
            prevV = c.v;

            // when transitioning from one road to the next, do not transfer a car to new road 
            // until fully on the new road
            // (so cars travel beyond the end of their own road before transfering)
            if ((r.len + c.len) < c.pos) {
                if (r.next) {
                    c.pos = c.pos - r.len;
                    r.next.cars[r.next.cars.length] = c;
                }
                shift++;
            }
        }
        r.cars.length -= shift;
    }
    function minTrailingDistance(prevV) {
        const factor = 2;
        // add factor for every 10 m/s of preV
        return 1 + (prevV / 10) * factor;
    }
}


function tick() {
    window.setTimeout(tick, 33.3);
    update(0.0333);
    render(mapOffsetX, mapOffsetY);
}

document.body.addEventListener('keydown', function(e) {
    const shiftFactor = 50;
    var evt = window.event ? window.event : e;
    switch (evt.keyCode) {
        case 37:  // left
            mapOffsetX += shiftFactor;
           break;
        case 38: // up
        mapOffsetY += shiftFactor;
            break;
        case 39: // right
            mapOffsetX -= shiftFactor;
            break;
        case 40: // down
            mapOffsetY -= shiftFactor;
            break;
    }
});


document.body.addEventListener('wheel', function(e) {
    const zoomFactor = 50;
    var evt = window.event ? window.event : e;
    if (evt.deltaY) {
        if (evt.deltaY > 0 ) {
            zoom += zoomIncrement;
            if (zoom > maxZoom) {
                zoom = maxZoom;
            }
        } else {
            zoom -= zoomIncrement;
            if (zoom < minZoom) {
                zoom = minZoom;
            }
        }
    }
});

tick();




