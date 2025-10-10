import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://database.euka.ai";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ0c3Bsd3NnanZwaWx4eXdtYWJhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDY2NDUzODEsImV4cCI6MjAyMjIyMTM4MX0.saBq4JP1zH5GufHSd-hIQVcyPQngw_kONPffmXCeJeA";

const client = createClient(SUPABASE_URL, SUPABASE_KEY);

const { data, error } = await client.from("users").select("*");

console.log(data);
console.log(error);
