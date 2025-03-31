import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://szuxymwbyktjtrfvvmhm.supabase.co"; // <- Deine Project URL
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN6dXh5bXdieWt0anRyZnZ2bWhtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM0NjAyMDIsImV4cCI6MjA1OTAzNjIwMn0.rds4MGTbwX5FpGfP7gRbAgGAGnLa-wpeXJ3sud1Neiw";   // <- Dein anon key

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
