const { getBacklogDashboard } = require('./src/controllers/backlogController');

async function testController() {
    const req = {
        query: {
            groupBy: 'cidade'
        }
    };

    const res = {
        json: (data) => {
            if (!Array.isArray(data)) {
                console.log(data.data[0]);
                console.log(data.data[1]);
            }
        },
        status: (code) => {
            console.log('Status set to:', code);
            return res;
        }
    };

    try {
        await getBacklogDashboard(req, res);
    } catch (e) {
        console.error('Test script caught error:', e);
    } finally {
        setTimeout(() => process.exit(0), 1000);
    }
}
testController();
