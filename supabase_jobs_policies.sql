
CREATE POLICY "Leitura pública de vagas ativas" ON jobs
  FOR SELECT USING (true);


CREATE POLICY "Autenticados gerenciam vagas" ON jobs
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Leitura pública de tags de vagas" ON job_tags
  FOR SELECT USING (true);

CREATE POLICY "Autenticados gerenciam tags de vagas" ON job_tags
  FOR ALL USING (auth.role() = 'authenticated');
