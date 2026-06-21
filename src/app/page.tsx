import Header from "@/components/shell/Header";
import Hero from "@/components/shell/Hero";
import Console from "@/components/playground/Console";
import Footer from "@/components/shell/Footer";

export default function Page() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <Console />
        <Footer />
      </main>
    </>
  );
}
