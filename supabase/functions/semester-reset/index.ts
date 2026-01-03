import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('semester-reset invoked', {
    method: req.method,
    hasAuthHeader: !!req.headers.get('Authorization'),
    time: new Date().toISOString(),
  });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const anonKey =
      Deno.env.get('SUPABASE_ANON_KEY') ??
      Deno.env.get('SUPABASE_PUBLISHABLE_KEY') ??
      '';

    if (!supabaseUrl || !serviceRoleKey || !anonKey) {
      console.error('Missing required env vars', {
        hasUrl: !!supabaseUrl,
        hasServiceRole: !!serviceRoleKey,
        hasAnon: !!anonKey,
      });
      return new Response(
        JSON.stringify({ success: false, error: 'Server is missing required configuration' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create admin client with service role
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);


    // Get the user from the auth header to verify they're an admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('No authorization header');
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create client with user's token to check their role
    const supabaseUser = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      console.error('Failed to get user:', userError);
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is admin
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (roleError || !roleData) {
      console.error('User is not admin:', roleError);
      return new Response(
        JSON.stringify({ success: false, error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate confirmation text
    const { confirmationText } = await req.json();
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();
    const semester = month >= 0 && month <= 4 ? 'SPRING' : 'FALL';
    const expectedConfirmation = `RESET ${semester} ${year}`;

    if (confirmationText !== expectedConfirmation) {
      console.error('Invalid confirmation text');
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid confirmation text' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Starting semester reset by admin ${user.id} at ${new Date().toISOString()}`);

    // Delete in order of dependencies (children first)
    
    // 1. Delete party photo votes
    const { error: photoVotesError } = await supabaseAdmin
      .from('party_photo_votes')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
    if (photoVotesError) console.error('Error deleting party photo votes:', photoVotesError);
    else console.log('Deleted party photo votes');

    // 2. Delete party photos
    const { error: photosError } = await supabaseAdmin
      .from('party_photos')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    if (photosError) console.error('Error deleting party photos:', photosError);
    else console.log('Deleted party photos');

    // 3. Delete party comment votes
    const { error: partyCommentVotesError } = await supabaseAdmin
      .from('party_comment_votes')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    if (partyCommentVotesError) console.error('Error deleting party comment votes:', partyCommentVotesError);
    else console.log('Deleted party comment votes');

    // 4. Delete party comments
    const { error: partyCommentsError } = await supabaseAdmin
      .from('party_comments')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    if (partyCommentsError) console.error('Error deleting party comments:', partyCommentsError);
    else console.log('Deleted party comments');

    // 5. Delete party ratings
    const { error: partyRatingsError } = await supabaseAdmin
      .from('party_ratings')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    if (partyRatingsError) console.error('Error deleting party ratings:', partyRatingsError);
    else console.log('Deleted party ratings');

    // 6. Delete party attendance
    const { error: attendanceError } = await supabaseAdmin
      .from('party_attendance')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    if (attendanceError) console.error('Error deleting party attendance:', attendanceError);
    else console.log('Deleted party attendance');

    // 7. Delete parties
    const { error: partiesError } = await supabaseAdmin
      .from('parties')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    if (partiesError) console.error('Error deleting parties:', partiesError);
    else console.log('Deleted parties');

    // 8. Delete fraternity comment votes
    const { error: fratCommentVotesError } = await supabaseAdmin
      .from('fraternity_comment_votes')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    if (fratCommentVotesError) console.error('Error deleting fraternity comment votes:', fratCommentVotesError);
    else console.log('Deleted fraternity comment votes');

    // 9. Delete fraternity comments
    const { error: fratCommentsError } = await supabaseAdmin
      .from('fraternity_comments')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    if (fratCommentsError) console.error('Error deleting fraternity comments:', fratCommentsError);
    else console.log('Deleted fraternity comments');

    // 10. Delete reputation ratings
    const { error: reputationRatingsError } = await supabaseAdmin
      .from('reputation_ratings')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    if (reputationRatingsError) console.error('Error deleting reputation ratings:', reputationRatingsError);
    else console.log('Deleted reputation ratings');

    // 11. Delete chat message votes
    const { error: chatVotesError } = await supabaseAdmin
      .from('chat_message_votes')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    if (chatVotesError) console.error('Error deleting chat message votes:', chatVotesError);
    else console.log('Deleted chat message votes');

    // 12. Delete chat messages
    const { error: chatMessagesError } = await supabaseAdmin
      .from('chat_messages')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    if (chatMessagesError) console.error('Error deleting chat messages:', chatMessagesError);
    else console.log('Deleted chat messages');

    // 13. Delete move votes
    const { error: moveVotesError } = await supabaseAdmin
      .from('move_votes')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    if (moveVotesError) console.error('Error deleting move votes:', moveVotesError);
    else console.log('Deleted move votes');

    // 14. Reset fraternity scores to defaults
    const { error: fratResetError } = await supabaseAdmin
      .from('fraternities')
      .update({
        base_score: 5.0,
        reputation_score: 5.0,
        historical_party_score: 5.0,
        momentum: 0,
        display_score: 5.0
      })
      .neq('id', '00000000-0000-0000-0000-000000000000');
    if (fratResetError) console.error('Error resetting fraternity scores:', fratResetError);
    else console.log('Reset fraternity scores to defaults');

    // 15. Delete any existing reset_complete announcements first
    const { error: deleteAnnouncementError } = await supabaseAdmin
      .from('semester_announcements')
      .delete()
      .eq('type', 'reset_complete');
    if (deleteAnnouncementError) console.error('Error deleting old announcements:', deleteAnnouncementError);

    // 16. Create welcome announcement for the new semester
    const nextMonth = now.getMonth();
    const nextYear = now.getFullYear();
    const nextSemester = nextMonth >= 0 && nextMonth <= 4 ? 'Spring' : 'Fall';
    const newSemesterName = `${nextSemester} ${nextYear}`;

    const { error: announcementError } = await supabaseAdmin
      .from('semester_announcements')
      .insert({
        type: 'reset_complete',
        title: `Welcome to ${newSemesterName}! 🎉`,
        message: `A new semester means a fresh start! All previous ratings, parties, photos, and comments have been cleared.`,
        semester_name: newSemesterName,
        created_by: user.id,
        expires_at: null // Never expires, users just dismiss it
      });
    if (announcementError) console.error('Error creating welcome announcement:', announcementError);
    else console.log('Created welcome announcement for new semester');

    // 17. Clear all user dismissals so everyone sees the new announcement
    const { error: clearDismissalsError } = await supabaseAdmin
      .from('user_dismissed_announcements')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    if (clearDismissalsError) console.error('Error clearing dismissals:', clearDismissalsError);
    else console.log('Cleared user dismissals');

    console.log(`Semester reset completed successfully at ${new Date().toISOString()}`);

    return new Response(
      JSON.stringify({ success: true, message: 'Semester reset completed' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    console.error('Semester reset error:', error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
