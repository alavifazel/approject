#include <cadmium/core/logger/csv.hpp>
#include <cadmium/core/simulation/root_coordinator.hpp>
#include <cadmium/lib/iestream.hpp>
#include <limits>

_INCLUDES_
using namespace std;

namespace cadmium::iot {

_COUPLED_MODELS_DEFS_

}

using namespace cadmium::iot;

int main() {
    auto model = make_shared<top_model>("top");
    auto rootCoordinator = cadmium::RootCoordinator(model);
    auto logger = make_shared<cadmium::CSVLogger>("log.csv", ";");
    rootCoordinator.setLogger(logger);
    rootCoordinator.start();
    rootCoordinator.simulate(std::numeric_limits<double>::infinity());
    rootCoordinator.stop();
    return 0;
}
