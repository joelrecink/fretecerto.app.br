import { motion } from "framer-motion";
import { ArrowRight, MapPin, Package, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

const Hero = () => {
  return (
    <section id="home" className="relative min-h-screen flex items-center overflow-hidden bg-hero">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-20 left-10 w-72 h-72 bg-accent rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-brand-orange-light rounded-full blur-3xl" />
      </div>

      {/* Geometric shapes */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 50, repeat: Infinity, ease: "linear" }}
          className="absolute -top-20 -right-20 w-96 h-96 border border-accent/20 rounded-full"
        />
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
          className="absolute -bottom-40 -left-40 w-[500px] h-[500px] border border-accent/10 rounded-full"
        />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Text Content */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center lg:text-left"
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 bg-accent/20 backdrop-blur-sm px-4 py-2 rounded-full mb-6"
            >
              <span className="w-2 h-2 bg-accent rounded-full animate-pulse" />
              <span className="text-accent-foreground text-sm font-medium">
                Líder em logística no Brasil
              </span>
            </motion.div>

            <h1 className="font-heading text-4xl md:text-5xl lg:text-6xl font-bold text-primary-foreground leading-tight mb-6">
              Sua carga no{" "}
              <span className="text-accent">destino certo</span>,{" "}
              sempre no prazo
            </h1>

            <p className="text-lg text-primary-foreground/80 mb-8 max-w-xl mx-auto lg:mx-0">
              Soluções completas em transporte rodoviário de cargas. 
              Segurança, agilidade e tecnologia para sua empresa crescer.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Button variant="hero" size="lg" className="group">
                Comece Agora
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button variant="hero-outline" size="lg">
                Rastrear Carga
              </Button>
            </div>

            {/* Quick Stats */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="grid grid-cols-3 gap-6 mt-12 pt-8 border-t border-primary-foreground/10"
            >
              {[
                { icon: MapPin, value: "27", label: "Estados" },
                { icon: Package, value: "50K+", label: "Entregas/mês" },
                { icon: Clock, value: "99%", label: "No prazo" },
              ].map((stat, index) => (
                <div key={index} className="text-center lg:text-left">
                  <stat.icon className="w-5 h-5 text-accent mb-2 mx-auto lg:mx-0" />
                  <div className="font-heading font-bold text-2xl text-primary-foreground">
                    {stat.value}
                  </div>
                  <div className="text-sm text-primary-foreground/60">{stat.label}</div>
                </div>
              ))}
            </motion.div>
          </motion.div>

          {/* Hero Image/Illustration */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="relative hidden lg:block"
          >
            <div className="relative">
              {/* Truck SVG Illustration */}
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="relative z-10"
              >
                <svg viewBox="0 0 400 300" className="w-full h-auto drop-shadow-2xl">
                  {/* Road */}
                  <rect x="0" y="230" width="400" height="20" rx="10" fill="hsl(28 95% 53% / 0.3)" />
                  
                  {/* Truck Body */}
                  <rect x="60" y="120" width="180" height="100" rx="8" fill="hsl(var(--accent))" />
                  <rect x="70" y="130" width="160" height="80" rx="4" fill="hsl(28 95% 45%)" />
                  
                  {/* Cabin */}
                  <rect x="240" y="150" width="80" height="70" rx="8" fill="hsl(var(--primary))" />
                  <rect x="260" y="160" width="50" height="35" rx="4" fill="hsl(210 20% 85%)" />
                  
                  {/* Wheels */}
                  <circle cx="120" cy="230" r="25" fill="hsl(222 47% 15%)" />
                  <circle cx="120" cy="230" r="15" fill="hsl(210 20% 40%)" />
                  <circle cx="200" cy="230" r="25" fill="hsl(222 47% 15%)" />
                  <circle cx="200" cy="230" r="15" fill="hsl(210 20% 40%)" />
                  <circle cx="280" cy="230" r="25" fill="hsl(222 47% 15%)" />
                  <circle cx="280" cy="230" r="15" fill="hsl(210 20% 40%)" />
                  
                  {/* Logo on truck */}
                  <text x="130" y="180" fill="white" fontSize="24" fontWeight="bold" fontFamily="Poppins">FC</text>
                </svg>
              </motion.div>

              {/* Floating Elements */}
              <motion.div
                animate={{ y: [0, -15, 0] }}
                transition={{ duration: 3, repeat: Infinity, delay: 0.5 }}
                className="absolute top-10 right-10 bg-card p-4 rounded-xl shadow-lg"
              >
                <Package className="w-8 h-8 text-accent" />
              </motion.div>

              <motion.div
                animate={{ y: [0, -20, 0] }}
                transition={{ duration: 4, repeat: Infinity, delay: 1 }}
                className="absolute bottom-20 left-0 bg-card p-4 rounded-xl shadow-lg"
              >
                <MapPin className="w-8 h-8 text-brand-navy" />
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
      >
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="w-6 h-10 border-2 border-primary-foreground/30 rounded-full flex justify-center pt-2"
        >
          <div className="w-1 h-2 bg-accent rounded-full" />
        </motion.div>
      </motion.div>
    </section>
  );
};

export default Hero;
