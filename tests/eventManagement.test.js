const request = require('supertest');
const app = require('../app');

describe('Event Management API', () => {
  // Test adding a user to an event
  describe('POST /events/:event_id/users', () => {
    it('should add a user to the event', async () => {
      const event_id = '11111111-1111-1111-1111-111111111114';
      const user_id = '11111111-1111-1111-1111-111111111112';

      const response = await request(app)
        .post(`/api/events/${event_id}/users`)
        .send({ "user_id": user_id });

      expect(response.statusCode).toBe(201);
      expect(response.body).toHaveProperty('status', 'OK');
      expect(response.body).toHaveProperty('message', 'User added to the event successfully.');
    });

    it('should return an error if the event does not exist', async () => {
      const event_id = '11111111-9999-1111-1111-111111111112';
      const user_id = '11111111-1111-1111-1111-111111111112';

      const response = await request(app)
        .post(`/api/events/${event_id}/users`)
        .send({ "user_id": user_id });

      expect(response.statusCode).toBe(404);
      expect(response.body).toHaveProperty('status', 'Error');
      expect(response.body).toHaveProperty('message', `Event with the id ${event_id} does not exist. User not added.`);
    });
  });
});