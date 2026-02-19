// Supabase Configuration
// Replace these values with your Supabase project credentials
const SUPABASE_URL = 'https://ckecbzepesnomedmqrpd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNrZWNiemVwZXNub21lZG1xcnBkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5MjY5MDYsImV4cCI6MjA4NjUwMjkwNn0.E378If7GuI67WZc2KpAX12Gyr_cf8yBtBlQIOYxoFVo';

// Initialize Supabase client
const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function adminSignIn(email, password) {
    const { error } = await db.auth.signInWithPassword({ email, password });
    if (error) throw error;
}
async function adminSignOut() {
    await db.auth.signOut();
}
async function getAdminSession() {
    const { data: { session } } = await db.auth.getSession();
    return session;
}