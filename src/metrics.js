const config = require('./config.js');
const os = require('os');

let metrics = [];
let requests = 0;
let getRequests = 0;
let postRequests = 0;
let putRequests = 0;
let deleteRequests = 0;

function sendMetricsPeriodically(period) {
    const timer = setInterval(() => {
      try {
        const buf = "";
        // httpMetrics(buf);
        // systemMetrics(buf);
        // userMetrics(buf);
        // purchaseMetrics(buf);
        // authMetrics(buf);

        systemMetrics();
        httpMetrics();

        const metric = {
            resourceMetrics: [
                {
                  scopeMetrics: [
                    {
                      metrics: metrics,
                    },
                  ],
                },
              ],
            };   
        sendMetricToGrafana(metric);
        metrics = [];
      } catch (error) {
        console.log('Error sending metrics', error);
      }
    }, period);
  }


function getCpuUsagePercentage() {
  const cpuUsage = os.loadavg()[0] / os.cpus().length;
  return cpuUsage.toFixed(2) * 100;
}

function getMemoryUsagePercentage() {
  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  const usedMemory = totalMemory - freeMemory;
  const memoryUsage = (usedMemory / totalMemory) * 100;
  return memoryUsage.toFixed(2);
}

function httpMetrics() {
    addMetric('requests', requests, 'sum', '1');
    addMetric('GET', getRequests, 'sum', '1');
    addMetric('POST', postRequests, 'sum', '1');
    addMetric('PUT', putRequests, 'sum', '1');
    addMetric('DELETE', deleteRequests, 'sum', '1');
}

function systemMetrics() {
    const cpuUsage = getCpuUsagePercentage();
    const memoryUsage = getMemoryUsagePercentage();
    const cpuMetric = {
        name: "cpu",
        unit: "%",
        gauge: {
            dataPoints: [
            {
                asInt: Math.round(cpuUsage),
                timeUnixNano: Date.now() * 1000000,
                attributes: [
                {
                    key: "source",
                    value: { "stringValue": "jwt-pizza-service" }
                }
                ]
            }
            ]
        }
        };
        metrics.push(cpuMetric);

    const memoryMetric = {
        name: "memory",
        unit: "%",
        gauge: {
            dataPoints: [
            {
                asInt: Math.round(memoryUsage),
                timeUnixNano: Date.now() * 1000000,
                attributes: [
                {
                    key: "source",
                    value: { "stringValue": "jwt-pizza-service" }
                }
                ]
            }
            ]
        }}
    metrics.push(memoryMetric);
}

async function requestTracker(req, res, next) {
    requests++;
    //sendMetricToGrafana('requests', req.method, 'sum', '1');
    if (req.method === 'GET') {
        getRequests++;
    } else if (req.method === 'POST') {
        postRequests++;
    } else if (req.method === 'PUT') {
        putRequests++;
    } else if (req.method === 'DELETE') {
        deleteRequests++;
    }
    next();
  }

  function addMetric(metricName, metricValue, type, unit) {
    const metric = {
        name: metricName,
        unit: unit,
        [type]: {
        dataPoints: [
            {
            asInt: metricValue,
            timeUnixNano: Date.now() * 1000000,
            attributes: [
                {
                    key: "source",
                    value: { "stringValue": "jwt-pizza-service" }
                }
            ]
            },
        ],
        }
    };
    if (type === 'sum') {
        metric[type].aggregationTemporality = 'AGGREGATION_TEMPORALITY_CUMULATIVE';
        metric[type].isMonotonic = true;
    }

    metrics.push(metric);

    // const body = JSON.stringify(metric);
    // fetch(`${config.url}`, {
    //     method: 'POST',
    //     body: body,
    //     headers: { Authorization: `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' },
    // })
    //     .then((response) => {
    //     if (!response.ok) {
    //         response.text().then((text) => {
    //         console.error(`Failed to push metrics data to Grafana: ${text}\n${body}`);
    //         });
    //     } else {
    //         console.log(`Pushed ${metricName}`);
    //     }
    //     })
    //     .catch((error) => {
    //     console.error('Error pushing metrics:', error);
    //     });
}

function sendMetricToGrafana(metric) {
    const body = JSON.stringify(metric);
    fetch(`${config.metrics.url}`, {
        method: 'POST',
        body: body,
        headers: { Authorization: `Bearer ${config.metrics.apiKey}`, 'Content-Type': 'application/json' },
    })
        .then((response) => {
        if (!response.ok) {
            response.text().then((text) => {
            console.error(`Failed to push metrics data to Grafana: ${text}\n${body}`);
            });
        } else {
            console.log(`Pushed metrics`);
        }
        })
        .catch((error) => {
        console.error('Error pushing metrics:', error);
        });
}

// function sendMetricToGrafana(metricName, metricValue, type, unit) {
//     const metric = {
//       resourceMetrics: [
//         {
//           scopeMetrics: [
//             {
//               metrics: [
//                 {
//                   name: metricName,
//                   unit: unit,
//                   [type]: {
//                     dataPoints: [
//                       {
//                         asInt: metricValue,
//                         timeUnixNano: Date.now() * 1000000,
//                       },
//                     ],
//                   },
//                 },
//               ],
//             },
//           ],
//         },
//       ],
//     };
//     if (type === 'sum') {
//         metric.resourceMetrics[0].scopeMetrics[0].metrics[0][type].aggregationTemporality = 'AGGREGATION_TEMPORALITY_CUMULATIVE';
//         metric.resourceMetrics[0].scopeMetrics[0].metrics[0][type].isMonotonic = true;
//     }

//     const body = JSON.stringify(metric);
//     fetch(`${config.url}`, {
//         method: 'POST',
//         body: body,
//         headers: { Authorization: `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' },
//     })
//         .then((response) => {
//         if (!response.ok) {
//             response.text().then((text) => {
//             console.error(`Failed to push metrics data to Grafana: ${text}\n${body}`);
//             });
//         } else {
//             console.log(`Pushed ${metricName}`);
//         }
//         })
//         .catch((error) => {
//         console.error('Error pushing metrics:', error);
//         });
// }
  
sendMetricsPeriodically(10000);

module.exports = { requestTracker}