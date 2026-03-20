// Supabase 클라이언트 설정
// 아래 값을 Supabase 프로젝트의 실제 값으로 교체하세요
const SUPABASE_URL = 'https://ltlvcypclesaekllouju.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx0bHZjeXBjbGVzYWVrbGxvdWp1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5NTExMTEsImV4cCI6MjA4OTUyNzExMX0.vg7Mx_mDH1jAg-bqUnv7JKHRN037DcH_p4BmsYU-JSA';

const { createClient } = supabase;
const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default sb;
