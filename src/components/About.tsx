import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";

const features = [
  "Frota 100% rastreada via GPS",
  "Motoristas treinados e certificados",
  "Cobertura em todos os 27 estados",
  "Atendimento 24 horas",
  "Integração com seu sistema",
  "Relatórios personalizados",
];

const About = () => {
  return (
    <section id="about" className="py-24 bg-muted/30 relative overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Image/Visual */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="relative"
          >
            <div className="relative rounded-2xl overflow-hidden">
              {/* Abstract logistics visual */}
              <div className="aspect-[4/3] bg-gradient-to-br from-primary via-brand-navy-light to-primary rounded-2xl relative overflow-hidden">
                {/* Grid pattern */}
                <div className="absolute inset-0 opacity-20">
                  {[...Array(8)].map((_, i) => (
                    <div
                      key={i}
                      className="absolute h-px w-full bg-accent"
                      style={{ top: `${(i + 1) * 12.5}%` }}
                    />
                  ))}
                  {[...Array(8)].map((_, i) => (
                    <div
                      key={i}
                      className="absolute w-px h-full bg-accent"
                      style={{ left: `${(i + 1) * 12.5}%` }}
                    />
                  ))}
                </div>

                {/* Animated routes */}
                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 300">
                  <motion.path
                    d="M50,150 Q150,50 250,150 T400,150"
                    fill="none"
                    stroke="hsl(28 95% 53%)"
                    strokeWidth="3"
                    strokeDasharray="10,5"
                    initial={{ pathLength: 0 }}
                    whileInView={{ pathLength: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 2, ease: "easeInOut" }}
                  />
                  <motion.path
                    d="M0,200 Q100,100 200,200 Q300,300 400,200"
                    fill="none"
                    stroke="hsl(28 95% 53% / 0.5)"
                    strokeWidth="2"
                    strokeDasharray="5,5"
                    initial={{ pathLength: 0 }}
                    whileInView={{ pathLength: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 2.5, ease: "easeInOut", delay: 0.3 }}
                  />
                  
                  {/* Location dots */}
                  <motion.circle
                    cx="50" cy="150"
                    r="8"
                    fill="hsl(28 95% 53%)"
                    initial={{ scale: 0 }}
                    whileInView={{ scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.5 }}
                  />
                  <motion.circle
                    cx="250" cy="150"
                    r="8"
                    fill="hsl(28 95% 53%)"
                    initial={{ scale: 0 }}
                    whileInView={{ scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 1.2 }}
                  />
                  <motion.circle
                    cx="350" cy="150"
                    r="8"
                    fill="hsl(28 95% 53%)"
                    initial={{ scale: 0 }}
                    whileInView={{ scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 1.8 }}
                  />
                </svg>

                {/* Text overlay */}
                <div className="absolute bottom-6 left-6 right-6">
                  <div className="bg-card/95 backdrop-blur-sm rounded-xl p-6 shadow-lg">
                    <div className="font-heading font-bold text-2xl text-foreground mb-1">
                      +15 anos
                    </div>
                    <div className="text-muted-foreground">
                      conectando o Brasil de ponta a ponta
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Floating badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.5 }}
              className="absolute -top-6 -right-6 bg-accent text-accent-foreground px-6 py-3 rounded-xl shadow-accent font-heading font-bold"
            >
              Qualidade Garantida
            </motion.div>
          </motion.div>

          {/* Content */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <span className="text-accent font-semibold text-sm uppercase tracking-wider">
              Por que nos escolher
            </span>
            <h2 className="font-heading text-3xl md:text-4xl font-bold text-foreground mt-3 mb-6">
              Experiência que faz a{" "}
              <span className="text-accent">diferença</span>
            </h2>
            <p className="text-muted-foreground text-lg mb-8 leading-relaxed">
              Com mais de 15 anos no mercado, a Frete Certo construiu uma 
              reputação sólida baseada em confiabilidade, transparência e 
              compromisso com resultados. Nossa tecnologia e equipe especializada 
              garantem que sua carga chegue sempre ao destino certo.
            </p>

            <div className="grid sm:grid-cols-2 gap-4 mb-8">
              {features.map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center gap-3"
                >
                  <CheckCircle2 className="w-5 h-5 text-accent flex-shrink-0" />
                  <span className="text-foreground">{feature}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default About;
