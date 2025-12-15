import { motion } from "framer-motion";
import { Truck, Package, Warehouse, Clock, Shield, MapPin } from "lucide-react";

const services = [
  {
    icon: Truck,
    title: "Transporte Rodoviário",
    description: "Frota própria e rastreada para todo o Brasil. Cargas fracionadas e lotação.",
  },
  {
    icon: Package,
    title: "Carga Expressa",
    description: "Entregas urgentes com prazos reduzidos. Ideal para demandas críticas.",
  },
  {
    icon: Warehouse,
    title: "Armazenagem",
    description: "Centros de distribuição estratégicos com gestão de estoque integrada.",
  },
  {
    icon: MapPin,
    title: "Rastreamento",
    description: "Monitoramento em tempo real. Acompanhe sua carga a qualquer momento.",
  },
  {
    icon: Shield,
    title: "Seguro Total",
    description: "Cobertura completa para sua carga. Tranquilidade do início ao fim.",
  },
  {
    icon: Clock,
    title: "Pontualidade",
    description: "99% das entregas no prazo. Compromisso com seu cronograma.",
  },
];

const Services = () => {
  return (
    <section id="services" className="py-24 bg-background relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-accent/5 to-transparent" />
      
      <div className="container mx-auto px-4 relative z-10">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-2xl mx-auto mb-16"
        >
          <span className="text-accent font-semibold text-sm uppercase tracking-wider">
            Nossos Serviços
          </span>
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-foreground mt-3 mb-4">
            Soluções completas em{" "}
            <span className="text-accent">logística</span>
          </h2>
          <p className="text-muted-foreground text-lg">
            Do transporte à armazenagem, oferecemos tudo que sua empresa precisa
            para uma operação logística eficiente.
          </p>
        </motion.div>

        {/* Services Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {services.map((service, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <div className="group h-full bg-card rounded-2xl p-8 border border-border/50 hover:border-accent/30 transition-all duration-300 hover:shadow-card">
                <div className="w-14 h-14 rounded-xl bg-accent/10 flex items-center justify-center mb-6 group-hover:bg-accent group-hover:shadow-accent transition-all duration-300">
                  <service.icon className="w-7 h-7 text-accent group-hover:text-accent-foreground transition-colors" />
                </div>
                <h3 className="font-heading font-semibold text-xl text-foreground mb-3">
                  {service.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {service.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Services;
