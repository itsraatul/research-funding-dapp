// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract MilestoneEscrow {
    struct Milestone {
        uint256 amount;
        bool released;
    }

    address public immutable company;
    address public immutable student;
    address public immutable university;
    Milestone[] public milestones;

    constructor(address _student, address _university, uint256[] memory _amounts) payable {
        company = msg.sender;
        student = _student;
        university = _university;

        uint256 total;
        for (uint256 i = 0; i < _amounts.length; i++) {
            milestones.push(Milestone({ amount: _amounts[i], released: false }));
            total += _amounts[i];
        }

        require(msg.value == total, "Deposit mismatch");
    }

    // ✅ Add new milestone dynamically (anyone can for demo)
    function addMilestone(uint256 amount) public payable {
        require(msg.value == amount, "Send exact amount");
        milestones.push(Milestone({ amount: amount, released: false }));
    }

    // ✅ Release milestone
    function approveMilestone(uint256 index) public {
        require(index < milestones.length, "Invalid milestone index");

        Milestone storage m = milestones[index];
        require(!m.released, "Already released");
        require(address(this).balance >= m.amount, "Insufficient funds");

        m.released = true;
        (bool success, ) = payable(student).call{value: m.amount}("");
        require(success, "Transfer failed");
    }

    function getMilestones() public view returns (Milestone[] memory) {
        return milestones;
    }

    function getBalance() public view returns (uint256) {
        return address(this).balance;
    }

    receive() external payable {}
}
