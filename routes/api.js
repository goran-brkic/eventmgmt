var express = require('express');
var router = express.Router();
const pool = require("../db");
const { v4: uuidv4 } = require('uuid');

/** Event Management */
// Add a user to an event
router.post('/events/:event_id/users', async function(req, res) {
    const event_id = req.params.event_id;
    const { user_id } = req.body;
  
    try {
      // Check if the event and user exist
      const eventsQuery = await pool.query(`SELECT * FROM events WHERE event_id = $1`, [event_id]);
      const usersQuery = await pool.query(`SELECT * FROM users WHERE user_id = $1`, [user_id]);
    
      // Event doesn't exist
      if(eventsQuery.rows.length === 0) {
        return res.status(404).send({
          status: 'Error',
          message: `Event with the id ${event_id} does not exist. User not added.`
        });
      }
      
      // User doesn't exist
      if(usersQuery.rows.length === 0) {
        return res.status(404).send({
          status: 'Error',
          message: `User with the id ${user_id} does not exist. User not added.`
        });
      }

      // User and event exist, insert

      // Check if user is already at this event
      const eventsQuery2 = await pool.query(`SELECT * FROM userevents WHERE event_id = $1 AND user_id = $2`, [event_id, user_id]);
      if(eventsQuery2.rowCount > 0) {
        res.status(409).send({
            status: 'Conflict',
            message: 'User is already invited to this meeting.'
          });
      }

      // Insert
      const insertQuery = await pool.query('INSERT INTO userevents (user_id, event_id) VALUES ($1, $2)', [user_id, event_id]);

      if (insertQuery.rowCount === 1) {
        // The insert was successful
        res.status(201).send({
            status: 'OK',
            message: 'User added to the event successfully.',
        });
      } else {
        res.status(500).send({
          status: 'Error',
          message: 'Failed to add user to the event.'
        });
      }
    } catch (error) {
      console.error('Error adding user to event:', error);
      res.status(500).send({
        status: 'Error',
        message: 'Failed to add user to the event.'
      });
    }
  });
  

  /** Meeting Management */
  // Create a meeting
  router.post('/events/:event_id/meetings', async function(req, res) {
    const event_id = req.params.event_id;
    const { title, description, user_id } = req.body;
    // const user_id = req.user.id; // we should be able to get this id but since I'm not implementing a login interface as a part of the task
                                    // the user_id comes from the req.body
  
    try {
      // Insert new meeting into the meetings table
      const meeting_id = uuidv4();
      const insertQuery = await pool.query(
        'INSERT INTO meetings (meeting_id, event_id, user_id, title, description) VALUES ($1, $2, $3, $4, $5)',
        [meeting_id, event_id, user_id, title, description]
      );
  
      if (insertQuery.rowCount === 1) {
        // The insert was successful
        res.status(201).send({
          status: 'Created',
          message: 'Meeting created successfully.',
          response: {
            meeting_id: meeting_id,
            user_id: user_id,
            title: title,
            description: description
          }
        });
      } else {
        res.status(500).send({
          status: 'Error',
          message: 'Failed to create meeting.'
        });
      }
    } catch (error) {
      console.error('Error creating meeting:', error);
      res.status(500).send({
        status: 'Error',
        message: 'Failed to create meeting.'
      });
    }
  });
  
  // Create invitations
  router.post('/meetings/:meeting_id/invitations', async function(req, res) {
    const meeting_id = req.params.meeting_id;
    const { invitee_id, message } = req.body;
  
    try {
      // Check if user is already invited to this meeting
      const invitesQuery = await pool.query(`SELECT * FROM invitations WHERE meeting_id = $1 AND invitee_id = $2`, [meeting_id, invitee_id]);
      if(invitesQuery.rowCount > 0) {
        res.status(409).send({
            status: 'Conflict',
            message: 'User is already invited to this meeting.'
        });
      } else {
        // First check if users are in the same event

        // Get the inviter_id from the meetings table
        const meetingQuery = await pool.query('SELECT user_id FROM meetings WHERE meeting_id = $1', [meeting_id]);

        // Check if the meeting exists
        if (meetingQuery.rows.length === 0) {
            return res.status(404).send({
                status: 'Error',
                message: `Meeting with the id ${meeting_id} does not exist. Invitation not sent.`
            });
        }

        const inviter_id = meetingQuery.rows[0].user_id;

        // Check if the inviter and invitee are in the same event
        const query = `
        SELECT *
        FROM userEvents AS ue1
        INNER JOIN userEvents AS ue2 ON ue1.event_id = ue2.event_id
        WHERE ue1.user_id = $1
        AND ue2.user_id = $2
        AND ue1.event_id = $3`;

        const usersQuery = await pool.query(query, [inviter_id, invitee_id, event_id]);

        // Users are not in the same event
        if (usersQuery.rows.length === 0) {
            return res.status(403).send({
            status: 'Error',
            message: 'Inviter and invitee are not in the same event. Invitation not sent.'
            });
        }

        // Insert
        const status = 'PENDING';
        const invitation_id = uuidv4();
        const insertQuery = await pool.query('INSERT INTO invitations (invitation_id, meeting_id, invitee_id, message, status) VALUES ($1, $2, $3, $4, $5)', 
            [invitation_id, meeting_id, invitee_id, message, status]);

        if (insertQuery.rowCount === 1) {
            // The insert was successful
            res.status(201).send({
                status: 'Created',
                message: 'Invitation created successfully.',
                response: {
                    invitation_id,
                    invitee_id,
                    message
                }
            });
        } else {
            res.status(500).send({
                status: 'Error',
                message: 'Failed to create meeting.'
            });
        }
      }
    } catch (error) {
      console.error('Error creating invitation:', error);
      res.status(500).send({
        status: 'Error',
        message: 'Failed to create invitation.'
      });
    }
  });
  
  // Accept invitation
  router.put('/invitations/:invitation_id/accept', async function(req, res) {
    const invitation_id = req.params.invitation_id;
  
    try {
      // Check if the user is already attending a meeting at the same date and time
      const { meeting_date, meeting_time } = await pool.query(
        'SELECT meeting_date, meeting_time FROM meetings WHERE meeting_id IN (SELECT meeting_id FROM invitations WHERE invitation_id = $1)',
        [invitation_id]
      );
  
      const conflictingMeeting = await pool.query(
        'SELECT * FROM meetings WHERE user_id = $1 AND meeting_date = $2 AND meeting_time = $3',
        [user_id, meeting_date, meeting_time]
      );
  
      // If the user has already accepted a meeting at this specific time, don't let him accept another
      if (conflictingMeeting.rows.length > 0) {
        return res.status(409).send({
          status: 'Conflict',
          message: 'User is already attending a meeting at the same date and time.'
        });
      }

      // Update the invitation status to "ACCEPTED" in the "invitations" table
      const updateQuery = await pool.query('UPDATE invitations SET status = $1 WHERE invitation_id = $2', ['ACCEPTED', invitation_id]);
  
      res.status(200).send({
        status: 'OK',
        message: 'Invitation accepted successfully.'
      });
    } catch (error) {
      console.error('Error accepting invitation:', error);
      res.status(500).send({
        status: 'Error',
        message: 'Failed to accept invitation.'
      });
    }
  });
  
  // Reject invitation
  router.put('/invitations/:invitation_id/reject', async function(req, res) {
    const invitationId = req.params.invitation_id;
  
    try {
      // Update the invitation status to "REJECTED" in the "invitations" table
      const updateQuery = await pool.query('UPDATE invitations SET status = $1 WHERE invitation_id = $2', ['REJECTED', invitation_id]);
  
      res.status(200).send({
        status: 'OK',
        message: 'Invitation rejected successfully.'
      });
    } catch (error) {
      console.error('Error rejecting invitation:', error);
      res.status(500).send({
        status: 'Error',
        message: 'Failed to reject invitation.'
      });
    }
  });
  
  // Schedule meeting
  router.put('/meetings/:meeting_id/schedule', async function(req, res) {
    const meeting_id = req.params.meeting_id;
    const { date, time } = req.body;
  
    try {
      // Check if the meeting exists
      const meetingQuery = await pool.query('SELECT * FROM meetings WHERE meeting_id = $1', [meeting_id]);

      if (meetingQuery.rows.length === 0) {
        // The meeting does not exist
        return res.status(404).send({
            status: 'Error',
            message: `Meeting with the id ${meeting_id} does not exist.`
        });
    }
        
      // Check if all invitees have responded
      const invitationsQuery = await pool.query('SELECT * FROM invitations WHERE meeting_id = $1', [meeting_id]);
      const pendingInvitations = invitationsQuery.rows.filter(invitation => invitation.status === 'PENDING');
  
      if (pendingInvitations.length > 0) {
        // There are still pending invitations, can't schedule the meeting
        return res.status(400).send({
          status: 'Error',
          message: 'Cannot schedule the meeting as not all invitees have yet responded.'
        });
      }
  
      // All invitees have responded, schedule the meeting
      const updateQuery = await pool.query('UPDATE meetings SET meeting_date = $1, meeting_time = $2 WHERE meeting_id = $3', [date, time, meetingId]);
  
      res.status(200).send({
        status: 'OK',
        message: 'Meeting scheduled successfully.'
      });
    } catch (error) {
      console.error('Error scheduling meeting:', error);
      res.status(500).send({
        status: 'Error',
        message: 'Failed to schedule meeting.'
      });
    }
  });
  
  // Get all invitations for a user
  router.get('/users/:user_id/invitations', async function(req, res) {
    const userId = req.params.user_id;
  
    try {

      const invitationsQuery = await pool.query('SELECT * FROM invitations WHERE invitee_id = $1', [userId]);
      const invitations = invitationsQuery.rows;
  
      res.status(200).send({
        status: 'OK',
        message: 'Fetched all invitations for the user.',
        response: invitations
      });
    } catch (error) {
      console.error('Error retrieving invitations:', error);
      res.status(500).send({
        status: 'Error',
        message: 'Failed to retrieve invitations.'
      });
    }
  });
  
  // Get all scheduled meetings for a user
  router.get('/users/:user_id/meetings', async function(req, res) {
    const userId = req.params.user_id;
  
    try {
      // Get all scheduled meetings for the specified user
      const meetingsQuery = await pool.query('SELECT * FROM meetings WHERE user_id = $1 AND meeting_date IS NOT NULL AND meeting_time IS NOT NULL', [userId]);
      const meetings = meetingsQuery.rows;
      console.log(meetingsQuery)
      console.log(meetings)
  
      res.status(200).send({
        status: 'OK',
        message: 'Fetched all meetings for the user.',
        response: meetings
      });
    } catch (error) {
      console.error('Error retrieving meetings:', error);
      res.status(500).send({
        status: 'Error',
        message: 'Failed to retrieve meetings.'
      });
    }
  });
  
  module.exports = router;  