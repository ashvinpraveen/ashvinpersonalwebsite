const gridLightSvg = `url("data:image/svg+xml,%3Csvg width='60' height='60' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='60' height='60' fill='none' stroke='rgba(0,0,0,0.06)' stroke-width='0.5'/%3E%3C/svg%3E")`;
const gridDarkSvg = `url("data:image/svg+xml,%3Csvg width='60' height='60' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='60' height='60' fill='none' stroke='rgba(255,255,255,0.06)' stroke-width='0.5'/%3E%3C/svg%3E")`;

const PageGrid = () => (
  <>
    <div
      className="pointer-events-none fixed inset-0 z-0 dark:hidden"
      aria-hidden="true"
      style={{ backgroundImage: gridLightSvg, backgroundRepeat: "repeat", backgroundSize: "60px 60px" }}
    />
    <div
      className="pointer-events-none fixed inset-0 z-0 hidden dark:block"
      aria-hidden="true"
      style={{ backgroundImage: gridDarkSvg, backgroundRepeat: "repeat", backgroundSize: "60px 60px" }}
    />
  </>
);

export default PageGrid;
