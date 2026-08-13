const request = require('supertest');
const app = require('./index');

describe('Unified Express Server', () => {
    it('should return health status', async () => {
        const res = await request(app).get('/api/health');
        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('status', 'ok');
    });
});
