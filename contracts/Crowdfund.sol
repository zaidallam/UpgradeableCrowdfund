// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

contract Crowdfund is Initializable, OwnableUpgradeable {
    using SafeERC20 for IERC20;

    IERC20 public token;

    mapping(uint256 => Project) public projects;
    uint256 public projectNonce;

    struct Project {
        address owner;
        string description;
        uint256 fundingGoal;
        uint256 totalFunds;
        uint32 start;
        uint32 end;
        mapping(address => uint256) contributions;
        bool claimed;
    }

    event Launch(
        uint256 indexed id,
        address indexed owner,
        string description,
        uint256 fundingGoal,
        uint32 start,
        uint32 end
    );
    event Abort(uint256 indexed id);
    event Contribution(
        uint256 indexed id,
        address indexed caller,
        uint256 amount
    );
    event Claim(uint256 indexed id, uint256 amount);
    event Refund(uint256 indexed id, address indexed caller, uint256 amount);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address currencyTokenAddress) public initializer {
        __Ownable_init();
        token = IERC20(currencyTokenAddress);
        projectNonce = 0;
    }

    function launch(
        string memory description,
        uint256 fundingGoal,
        uint32 end
    ) external {
        require(fundingGoal > 0, "Funding goal must be greater than 0");
        require(
            end > block.timestamp + 604_800,
            "End must be more than one week in the future"
        );

        projectNonce++;
        Project storage project = projects[projectNonce];

        project.owner = _msgSender();
        project.description = description;
        project.fundingGoal = fundingGoal;
        project.start = uint32(block.timestamp);
        project.end = end;

        emit Launch(
            projectNonce,
            _msgSender(),
            description,
            fundingGoal,
            uint32(block.timestamp),
            end
        );
    }

    function abort(uint256 projectID) external {
        Project storage project = projects[projectID];

        require(
            project.owner == _msgSender(),
            "This project either doesn't exist or isn't yours"
        );
        require(
            block.timestamp < project.end,
            "This project has already ended"
        );

        project.end = uint32(block.timestamp);
        emit Abort(projectID);
    }

    function contribute(uint256 projectID, uint256 amount) external {
        Project storage project = projects[projectID];
        require(project.owner != address(0), "This project doesn't exist");
        require(
            block.timestamp <= project.end,
            "This project has already ended"
        );
        token.transferFrom(_msgSender(), address(this), amount);
        project.totalFunds += amount;
        project.contributions[_msgSender()] += amount;

        emit Contribution(projectID, _msgSender(), amount);
    }

    function claim(uint256 projectID) external {
        Project storage project = projects[projectID];
        require(project.owner == _msgSender(), "This project isn't yours");
        require(block.timestamp > project.end, "This project is still ongoing");
        require(
            project.totalFunds >= project.fundingGoal,
            "This project didn't meet its funding goal"
        );
        require(
            !project.claimed,
            "You've already claimed the funds from this project"
        );

        project.claimed = true;
        token.transfer(project.owner, project.totalFunds);

        emit Claim(projectID, project.totalFunds);
    }

    function refund(uint256 projectID) external {
        Project storage project = projects[projectID];
        require(block.timestamp > project.end, "This project is still ongoing");
        require(
            project.totalFunds < project.fundingGoal,
            "This project has met its funding goal"
        );
        require(
            project.contributions[_msgSender()] > 0,
            "No contribution to refund"
        );

        uint256 contributionAmount = project.contributions[_msgSender()];
        project.contributions[_msgSender()] = 0;
        token.transfer(msg.sender, contributionAmount);

        emit Refund(projectID, _msgSender(), contributionAmount);
    }
}
